// LOCAL TESTING ONLY. Serves the built site and emulates the Supabase
// endpoints the app uses (PostgREST RPC, the subset of PostgREST table access
// used by the admin set-up screens, GoTrue password login) on top of a
// real local PostgreSQL that has the project's migrations applied. Every RPC
// runs under the same role (anon / authenticated) and auth.uid() as in
// Supabase, so RLS, grants and SECURITY DEFINER behave like production.
//
//   node e2e/server.mjs --port 4400 --dist dist-e2e --db fjg_e2e
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import pg from 'pg'

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : def
}
const PORT = Number(arg('port', 4400))
const DIST = arg('dist', 'dist-e2e')
// Same JSON shapes as PostgREST: dates stay "YYYY-MM-DD", instants are ISO strings.
pg.types.setTypeParser(1082, (v) => v)
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString())
const pool = new pg.Pool({ database: arg('db', 'fjg_e2e') })

// Fictitious test accounts (exist only in the throwaway test database).
const ACCOUNTS = {
  'admin@test.local': { password: 'test-password', id: '00000000-0000-0000-0000-0000000000a1' },
  'stranger@test.local': { password: 'test-password', id: '00000000-0000-0000-0000-0000000000b2' },
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const makeJwt = (sub, email) => {
  const now = Math.floor(Date.now() / 1000)
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub, email, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600, session_id: sub })}.test-signature`
}
const userOf = (req) => {
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '')
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const p = JSON.parse(Buffer.from(part, 'base64url').toString())
    return p.role === 'authenticated' && p.sub ? { id: p.sub, email: p.email } : null
  } catch {
    return null
  }
}
const userJson = (u) => ({
  id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, email_confirmed_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email' }, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
})

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json', ...headers })
  res.end(body === undefined ? '' : JSON.stringify(body))
}
const readBody = async (req) => {
  let data = ''
  for await (const c of req) data += c
  return data ? JSON.parse(data) : {}
}

const fnCache = new Map()
async function fnInfo(name) {
  if (!fnCache.has(name)) {
    const { rows } = await pool.query(
      `select p.proargnames as names, p.proargtypes::regtype[]::text[] as types, p.proretset as setof,
              p.prorettype::regtype::text as rettype
         from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`,
      [name],
    )
    fnCache.set(name, rows[0] ?? null)
  }
  return fnCache.get(name)
}

async function rpc(req, res, name) {
  if (name.startsWith('_')) return send(res, 404, { message: 'not found' })
  const info = await fnInfo(name)
  if (!info) return send(res, 404, { code: 'PGRST202', message: `function ${name} not found` })
  const body = await readBody(req)
  const names = info.names ?? []
  const params = []
  const sqlArgs = []
  for (const [k, v] of Object.entries(body)) {
    const i = names.indexOf(k)
    if (i < 0 || i >= info.types.length) return send(res, 400, { message: `unknown argument ${k}` })
    const type = info.types[i]
    params.push(type === 'jsonb' || type === 'json' ? JSON.stringify(v) : v)
    sqlArgs.push(`${k} => $${params.length}::${type}`)
  }
  const call = `public.${name}(${sqlArgs.join(', ')})`
  const sql = info.setof ? `select * from ${call}` : `select ${call} as r`
  const user = userOf(req)
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(`set local role ${user ? 'authenticated' : 'anon'}`)
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user?.id ?? ''])
    const { rows } = await client.query(sql, params)
    await client.query('commit')
    send(res, 200, info.setof ? rows : rows[0]?.r ?? null)
  } catch (e) {
    await client.query('rollback').catch(() => {})
    const status = e.code === 'P0001' ? 400 : e.code === '42501' ? 401 : 500
    send(res, status, { code: e.code, message: e.message, details: null, hint: null })
  } finally {
    client.release()
  }
}

// Minimal PostgREST table emulation: select/insert/update/delete with the
// filters the app uses (eq, is, gte, lte, gt, lt) and order. Identifiers are whitelisted.
const IDENT = /^[a-z_][a-z0-9_]*$/
const OPS = { eq: '=', gte: '>=', lte: '<=', gt: '>', lt: '<' }
async function table(req, res, name, url) {
  if (!IDENT.test(name)) return send(res, 400, { message: 'bad table' })
  const filters = [] // [sqlFragmentWithPlaceholderToken, value|undefined]
  let order = ''
  let columns = '*'
  for (const [k, v] of url.searchParams) {
    if (k === 'select') {
      columns = v.split(',').map((c) => c.trim()).filter((c) => IDENT.test(c)).join(', ') || '*'
    } else if (k === 'order') {
      const parts = []
      for (const o of v.split(',')) {
        const [col, dir] = o.split('.')
        if (!IDENT.test(col)) return send(res, 400, { message: 'bad order' })
        parts.push(`${col} ${dir === 'desc' ? 'desc' : 'asc'}`)
      }
      order = ` order by ${parts.join(', ')}`
    } else if (k !== 'columns') {
      if (!IDENT.test(k)) return send(res, 400, { message: 'bad filter' })
      const dot = v.indexOf('.')
      const op = v.slice(0, dot)
      const val = v.slice(dot + 1)
      if (op === 'is') filters.push([`${k} is ${val === 'null' ? 'null' : val === 'true' ? 'true' : 'false'}`])
      else if (OPS[op]) filters.push([`${k} ${OPS[op]} ?`, val])
      else return send(res, 400, { message: `unsupported operator ${op}` })
    }
  }
  const params = []
  const bind = (v) => {
    params.push(v)
    return `$${params.length}`
  }
  const whereSql = () => (filters.length ? ` where ${filters.map(([f, v]) => (v === undefined ? f : f.replace('?', bind(v)))).join(' and ')}` : '')

  let sql
  if (req.method === 'GET') sql = `select ${columns} from public.${name}${whereSql()}${order}`
  else if (req.method === 'DELETE') sql = `delete from public.${name}${whereSql()}`
  else {
    const body = await readBody(req)
    const rows = Array.isArray(body) ? body : [body]
    const keys = Object.keys(rows[0] ?? {})
    if (!keys.length || !keys.every((c) => IDENT.test(c))) return send(res, 400, { message: 'bad column' })
    if (req.method === 'POST') {
      const values = rows.map((r) => `(${keys.map((c) => bind(r[c])).join(', ')})`)
      sql = `insert into public.${name} (${keys.join(', ')}) values ${values.join(', ')}`
    } else if (req.method === 'PATCH') {
      const sets = keys.map((c) => `${c} = ${bind(rows[0][c])}`)
      sql = `update public.${name} set ${sets.join(', ')}${whereSql()}`
    } else return send(res, 405, { message: 'method not allowed' })
  }

  const user = userOf(req)
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query(`set local role ${user ? 'authenticated' : 'anon'}`)
    await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user?.id ?? ''])
    const { rows } = await client.query(sql, params)
    await client.query('commit')
    if (req.method !== 'GET') return send(res, 201, undefined)
    if ((req.headers.accept ?? '').includes('vnd.pgrst.object')) {
      return rows.length === 1 ? send(res, 200, rows[0]) : send(res, 406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })
    }
    send(res, 200, rows)
  } catch (e) {
    await client.query('rollback').catch(() => {})
    send(res, e.code === '42501' ? 403 : 400, { code: e.code, message: e.message, details: null, hint: null })
  } finally {
    client.release()
  }
}

async function auth(req, res, path, url) {
  if (path === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
    const { email, password } = await readBody(req)
    const acct = ACCOUNTS[email]
    if (!acct || acct.password !== password)
      return send(res, 400, { code: 'invalid_credentials', error: 'invalid_grant', error_code: 'invalid_credentials', msg: 'Invalid login credentials', error_description: 'Invalid login credentials' })
    const u = { id: acct.id, email }
    return send(res, 200, {
      access_token: makeJwt(u.id, email), token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `refresh-${u.id}`, user: userJson(u),
    })
  }
  if (path === '/auth/v1/user') {
    const u = userOf(req)
    return u ? send(res, 200, userJson(u)) : send(res, 401, { code: 'bad_jwt', msg: 'invalid JWT' })
  }
  if (path === '/auth/v1/logout') return send(res, 204)
  return send(res, 404, { msg: 'not implemented in test server' })
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' }
async function staticFile(res, path) {
  let file = normalize(join(DIST, decodeURIComponent(path)))
  if (!file.startsWith(normalize(DIST))) return send(res, 403, {})
  try {
    if (!(await stat(file)).isFile()) throw new Error()
  } catch {
    file = join(DIST, 'index.html') // SPA fallback
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
  res.end(await readFile(file))
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname
  try {
    if (path.startsWith('/rest/v1/rpc/') && req.method === 'POST') return await rpc(req, res, path.slice('/rest/v1/rpc/'.length))
    if (path.startsWith('/rest/v1/')) return await table(req, res, path.slice('/rest/v1/'.length), url)
    if (path.startsWith('/auth/v1/')) return await auth(req, res, path, url)
    return await staticFile(res, path)
  } catch (e) {
    send(res, 500, { message: String(e?.message ?? e) })
  }
}).listen(PORT, () => console.log(`test server on http://127.0.0.1:${PORT}`))
