// Generates one original line-art illustration per service (public/prestations/<slug>.svg),
// in the FJ GLOW burgundy & beige palette. Pure vector artwork made for the site:
// no photos, no people's likeness.   node scripts/catalog/gen-images.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { SERVICES } from './data.mjs'

const C = {
  burg: '#6B1E2E', burg2: '#8E2F42', wine: '#A84A5C', rose: '#C99A9C', blush: '#E6C9C1',
  beige: '#E9DBC7', sand: '#DCC7AC', cream: '#FBF6EE', skin: '#F1E2D2', line: '#6B1E2E',
}
const W = 400, H = 300
let uid = 0
const f = (n) => Math.round(n * 10) / 10

function frame(body, { tone = 0 } = {}) {
  const bgs = [['#F7EFE4', '#EADAC5'], ['#F6EDE3', '#E6D2C2'], ['#F8F1E7', '#E4D3BB']]
  const [a, b] = bgs[tone % bgs.length]
  const id = `g${uid++}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<radialGradient id="${id}h" cx=".72" cy=".2" r=".55"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".75"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.burg2}"/><stop offset="1" stop-color="${C.burg}"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#${id})"/>
<circle cx="200" cy="158" r="118" fill="${C.cream}" opacity=".55"/>
<circle cx="200" cy="158" r="128" fill="none" stroke="${C.burg}" stroke-opacity=".18" stroke-width="1"/>
<rect width="${W}" height="${H}" fill="url(#${id}h)"/>
${sparkles(tone)}
<g stroke-linecap="round" stroke-linejoin="round">${body.replaceAll('URLB', `url(#${id}b)`)}</g>
</svg>
`
}

function sparkle(x, y, r, o = 0.55) {
  return `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${C.burg}" opacity="${o}"/>`
}
function sparkles(t) {
  const sets = [[[58, 62, 7], [338, 238, 6], [352, 70, 4]], [[64, 236, 6], [334, 58, 7], [46, 120, 3.5]], [[350, 140, 6], [70, 70, 4.5], [86, 250, 5]]]
  return sets[t % 3].map(([x, y, r]) => sparkle(x, y, r, 0.35)).join('')
}

// ---------- nails ----------
function nailPath(x, y, w, h, tip = 0.42) {
  // y = tip top; bottom cuticle curve at y+h
  return `M${f(x - w / 2)} ${f(y + h)}C${f(x - w / 2)} ${f(y + h * tip)} ${f(x - w * 0.3)} ${f(y)} ${f(x)} ${f(y)}C${f(x + w * 0.3)} ${f(y)} ${f(x + w / 2)} ${f(y + h * tip)} ${f(x + w / 2)} ${f(y + h)}Q${f(x)} ${f(y + h - w * 0.32)} ${f(x - w / 2)} ${f(y + h)}Z`
}
function finger(x, top, w, len) {
  return `<path d="M${x - w / 2} ${top + len}V${top + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${top + w / 2}V${top + len}" fill="${C.skin}" stroke="${C.line}" stroke-width="2"/>`
}
function hand(nails) {
  // four fingers rising from the bottom; nails: fn(x, y, w) -> svg
  const xs = [140, 182, 224, 264], tops = [96, 70, 78, 110], ws = [36, 38, 37, 33]
  let s = ''
  xs.forEach((x, i) => { s += finger(x, tops[i], ws[i], 260) })
  xs.forEach((x, i) => { s += nails(x, tops[i] + 4, ws[i] - 10, i) })
  return s
}
const sheen = (x, y, h) => `<path d="M${x} ${y}q-3 ${h / 2} 0 ${h}" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="2.5" fill="none"/>`

function bottle(x, y, s = 1, fill = 'URLB') {
  return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-8" y="-62" width="16" height="34" rx="3" fill="${C.burg}"/><rect x="-24" y="-30" width="48" height="58" rx="14" fill="${fill}" stroke="${C.burg}" stroke-width="2"/><path d="M-14 -16q-2 16 0 30" stroke="#fff" stroke-opacity=".5" stroke-width="3" fill="none"/></g>`
}
function file(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.sand}" stroke-width="14"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.burg}" stroke-width="1.5" stroke-dasharray="2 5"/>`
}
function drop(x, y, s = 1, fill = 'URLB') {
  return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -26C10 -10 16 -2 16 8A16 16 0 0 1 -16 8C-16 -2 -10 -10 0 -26Z" fill="${fill}"/><path transform="translate(${x} ${y}) scale(${s})" d="M-7 6q0 7 6 9" stroke="#fff" stroke-opacity=".6" stroke-width="2.5" fill="none"/>`
}
function toes(nailFn) {
  // top view of a foot: five toes of decreasing size rising from the bottom
  const t = [[132, 112, 50], [184, 102, 38], [226, 112, 34], [264, 128, 30], [298, 148, 27]]
  let s = ''
  t.forEach(([x, top, w]) => { s += finger(x, top, w, 300) })
  s += `<path d="M104 300V214Q110 196 132 200H300Q318 206 318 230V300" fill="${C.skin}" stroke="none"/>`
  t.forEach(([x, top, w], i) => { s += nailFn(x, top + 5, w * 0.66, w * 0.62, i) })
  return s
}

// ---------- eyes / lashes ----------
const lid = (t) => { // quadratic from (110,150) ctrl (200,200) to (290,150)
  const x = (1 - t) ** 2 * 110 + 2 * (1 - t) * t * 200 + t * t * 290
  const y = (1 - t) ** 2 * 150 + 2 * (1 - t) * t * 198 + t * t * 150
  const dx = 2 * (1 - t) * 90 + 2 * t * 90, dy = 2 * (1 - t) * 48 + 2 * t * -48
  const len = Math.hypot(dx, dy)
  return { x, y, nx: -dy / len, ny: dx / len } // normal pointing down/outward
}
function eye({ count = 18, len = () => 26, fan = 1, curl = 0.35, style = '', color = C.burg, brow = true, from = 0.06, to = 0.96 } = {}) {
  let s = `<path d="M100 146Q200 206 300 146" fill="none" stroke="${C.line}" stroke-width="3"/>`
  if (brow) s += `<path d="M118 92Q196 56 286 86" fill="none" stroke="${C.burg}" stroke-opacity=".35" stroke-width="7"/>`
  for (let i = 0; i < count; i++) {
    const t = from + (to - from) * (i / (count - 1))
    const p = lid(t)
    for (let k = 0; k < fan; k++) {
      const spread = fan > 1 ? (k - (fan - 1) / 2) * 0.22 : 0
      const l = len(t, i) * (fan > 1 ? 0.92 + 0.08 * (k % 2) : 1)
      const ang = Math.atan2(p.ny, p.nx) + spread + (t - 0.5) * 0.7
      const ex = p.x + Math.cos(ang) * l, ey = p.y + Math.sin(ang) * l
      const cx = p.x + Math.cos(ang) * l * 0.55 + Math.cos(ang + Math.PI / 2) * l * curl * (t < 0.5 ? 1 : -1) * 0.3
      const cy = p.y + Math.sin(ang) * l * 0.55 - l * curl * 0.25
      s += `<path d="M${f(p.x)} ${f(p.y)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}" fill="none" stroke="${typeof color === 'function' ? color(t, i) : color}" stroke-width="${fan > 1 ? 1.6 : 2.2}" ${typeof style === 'function' ? style(t, i) : style}/>`
    }
  }
  return s
}
function liftedEye(extra = '') {
  // open eye, lashes lifted and curled upward
  let s = `<path d="M96 172Q200 92 304 172Q200 236 96 172Z" fill="${C.cream}" stroke="${C.line}" stroke-width="3"/>` +
    `<circle cx="200" cy="168" r="34" fill="${C.wine}"/><circle cx="200" cy="168" r="15" fill="${C.burg}"/><circle cx="211" cy="157" r="6" fill="#fff" opacity=".85"/>` +
    `<path d="M150 104Q200 70 262 98" fill="none" stroke="${C.burg}" stroke-opacity=".35" stroke-width="7"/>`
  for (let i = 0; i < 17; i++) {
    const t = 0.08 + 0.84 * (i / 16)
    const x = (1 - t) ** 2 * 96 + 2 * (1 - t) * t * 200 + t * t * 304
    const y = (1 - t) ** 2 * 172 + 2 * (1 - t) * t * 92 + t * t * 172
    const lean = (t - 0.5) * 40, l = 26 + Math.sin(t * Math.PI) * 10
    s += `<path d="M${f(x)} ${f(y)}C${f(x + lean * 0.3)} ${f(y - l * 0.5)} ${f(x + lean * 0.9 - 6)} ${f(y - l)} ${f(x + lean + 4)} ${f(y - l * 0.9)}" fill="none" stroke="${C.burg}" stroke-width="2.4"/>`
  }
  s += `<path d="M338 132a40 40 0 0 0-22-44" fill="none" stroke="${C.burg}" stroke-width="2" stroke-dasharray="3 5"/><path d="M308 84l9 3-1 10" fill="none" stroke="${C.burg}" stroke-width="2"/>`
  return s + extra
}
function browHairs(cx = 200, cy = 128, s = 1, color = C.burg) {
  let out = ''
  for (let i = 0; i < 34; i++) {
    const t = i / 33
    const x = cx - 110 * s + 220 * s * t
    const y = cy - Math.sin(Math.min(t * 1.25, 1) * Math.PI * 0.95) * 34 * s + (t > 0.8 ? (t - 0.8) * 60 * s : 0)
    const h = (16 + Math.sin(t * Math.PI) * 10) * s * (1 - t * 0.45)
    out += `<path d="M${f(x)} ${f(y + h / 2)}q${f(3 * s)} ${f(-h * 0.6)} ${f((6 + t * 10) * s)} ${f(-h)}" fill="none" stroke="${color}" stroke-width="2.4"/>`
  }
  return out
}
function spoolie(x, y, rot = -35) {
  let s = `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-4" y="0" width="8" height="70" rx="4" fill="${C.burg}"/><line x1="0" y1="0" x2="0" y2="-42" stroke="${C.burg}" stroke-width="2"/>`
  for (let i = 0; i < 9; i++) s += `<line x1="-9" y1="${-6 - i * 4}" x2="9" y2="${-4 - i * 4}" stroke="${C.burg}" stroke-width="1.6"/>`
  return s + '</g>'
}
function tweezers(x, y, rot = 30) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})" fill="none" stroke="${C.burg}" stroke-width="3"><path d="M0 0L-7 70"/><path d="M0 0L7 70"/><circle cx="0" cy="0" r="3" fill="${C.burg}"/></g>`
}

// ---------- body (waxing) ----------
const zone = (d) => `<path d="${d}" fill="${C.wine}" fill-opacity=".28" stroke="none"/>`
const body = (d, fill = C.skin) => `<path d="${d}" fill="${fill}" stroke="${C.line}" stroke-width="2.4"/>`
function spatula(x, y, rot = 25) {
  return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-7" y="-50" width="14" height="92" rx="7" fill="${C.sand}" stroke="${C.burg}" stroke-width="2"/><path d="M-7 -30h14v-13a7 7 0 0 0-14 0Z" fill="${C.burg2}" opacity=".8"/></g>`
}
function faceFront(highlight) {
  return body('M200 54C150 54 128 96 130 150C132 206 166 248 200 248C234 248 268 206 270 150C272 96 250 54 200 54Z') + highlight +
    `<path d="M160 140q16 10 30 0M210 140q16 10 30 0" fill="none" stroke="${C.burg}" stroke-width="2.2"/>` +
    `<path d="M155 120q18-12 36-4M209 116q18-8 36 4" fill="none" stroke="${C.burg}" stroke-width="4"/>` +
    `<path d="M200 150q-6 22 4 26" fill="none" stroke="${C.burg}" stroke-opacity=".6" stroke-width="2"/>` +
    `<path d="M180 206q20-10 40 0q-20 16-40 0Z" fill="${C.wine}"/>`
}
const ARM = 'M30 126C110 112 170 116 230 124C262 128 290 132 312 130C330 118 352 112 368 116C378 118 378 128 366 130L350 134C366 138 384 142 384 152C384 166 362 172 340 168C326 166 316 162 306 160C276 162 262 172 230 174C170 180 110 184 30 186Z'
const LEG = 'M24 104C110 92 170 100 214 116C226 108 240 110 248 122C276 132 300 136 322 140C326 112 332 86 344 70C352 60 370 62 372 74C374 100 372 140 366 172C362 188 340 192 326 186C300 184 262 186 220 184C170 182 110 198 24 198Z'

// ---------- make-up ----------
function lipstick(x, y, s = 1, rot = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><rect x="-20" y="0" width="40" height="70" rx="5" fill="${C.burg}"/><rect x="-16" y="-26" width="32" height="28" rx="3" fill="${C.sand}" stroke="${C.burg}" stroke-width="2"/><path d="M-12 -26V-52L12 -66V-26Z" fill="${C.wine}"/><path d="M-6 -30v-18" stroke="#fff" stroke-opacity=".5" stroke-width="3"/></g>`
}
function brush(x, y, rot = -30, s = 1) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><rect x="-5" y="0" width="10" height="90" rx="5" fill="${C.burg}"/><rect x="-7" y="-14" width="14" height="16" fill="${C.sand}" stroke="${C.burg}" stroke-width="1.5"/><path d="M-7 -14C-16 -30 -12 -52 0 -60C12 -52 16 -30 7 -14Z" fill="${C.rose}" stroke="${C.burg}" stroke-width="1.5"/></g>`
}
function palette(x, y) {
  const cols = [C.blush, C.rose, C.wine, C.sand, C.burg2, C.burg]
  let s = `<rect x="${x}" y="${y}" width="170" height="104" rx="14" fill="${C.cream}" stroke="${C.burg}" stroke-width="2.4"/>`
  cols.forEach((c, i) => { s += `<circle cx="${x + 32 + (i % 3) * 53}" cy="${y + 30 + Math.floor(i / 3) * 46}" r="18" fill="${c}"/>` })
  return s
}
function flower(x, y, r = 14) {
  let s = ''
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    s += `<ellipse cx="${f(x + Math.cos(a) * r * 0.7)}" cy="${f(y + Math.sin(a) * r * 0.7)}" rx="${r * 0.55}" ry="${r * 0.4}" transform="rotate(${f((a * 180) / Math.PI)} ${f(x + Math.cos(a) * r * 0.7)} ${f(y + Math.sin(a) * r * 0.7)})" fill="${C.cream}" stroke="${C.burg}" stroke-width="1.4"/>`
  }
  return s + `<circle cx="${x}" cy="${y}" r="${r * 0.28}" fill="${C.wine}"/>`
}

// ---------- hair ----------
function headBack(extra = '') {
  return body('M150 300C150 262 162 240 176 232L224 232C238 240 250 262 250 300Z') +
    `<path d="M200 70C150 70 128 108 132 150C136 192 160 222 200 226C240 222 264 192 268 150C272 108 250 70 200 70Z" fill="${C.burg}"/>` +
    Array.from({ length: 7 }, (_, i) => `<path d="M${146 + i * 18} ${110 + Math.abs(3 - i) * 6}Q${170 + i * 10} 150 ${172 + i * 9} 210" fill="none" stroke="${C.wine}" stroke-width="2" opacity=".8"/>`).join('') + extra
}
function bun(cx = 200, cy = 70, r = 36) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.burg2}"/><path d="M${cx - r * 0.7} ${cy}a${r * 0.7} ${r * 0.7} 0 0 1 ${r * 1.4} 0M${cx - r * 0.45} ${cy + 8}a${r * 0.45} ${r * 0.45} 0 0 1 ${r * 0.9} 0M${cx - r * 0.6} ${cy - 12}a${r * 0.6} ${r * 0.4} 0 0 1 ${r * 1.2} 0" fill="none" stroke="${C.rose}" stroke-width="2"/>`
}
function strands(lenTop, lenBottom, n = 13) {
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = 130 + i * (140 / (n - 1))
    const len = lenTop + (lenBottom - lenTop) * Math.sin((i / (n - 1)) * Math.PI)
    const sway = (i % 2 ? 1 : -1) * 10
    s += `<path d="M${f(x)} 34C${f(x + sway)} ${f(34 + len * 0.35)} ${f(x - sway)} ${f(34 + len * 0.7)} ${f(x + sway * 0.4)} ${f(34 + len)}" fill="none" stroke="${i % 3 === 0 ? C.wine : C.burg}" stroke-width="${i % 3 === 0 ? 3 : 5}"/>`
  }
  return `<rect x="118" y="22" width="164" height="16" rx="8" fill="${C.burg}"/>` + s
}
function dropper(x, y) {
  return `<g transform="translate(${x} ${y})"><rect x="-22" y="0" width="44" height="64" rx="10" fill="URLB"/><rect x="-9" y="-16" width="18" height="18" fill="${C.sand}" stroke="${C.burg}" stroke-width="1.5"/><path d="M-8 -16v-14a8 8 0 0 1 16 0v14" fill="${C.burg}"/><path d="M-12 12v36" stroke="#fff" stroke-opacity=".45" stroke-width="3"/></g>`
}
function dryer(x, y) {
  return `<g transform="translate(${x} ${y})"><rect x="-6" y="16" width="34" height="84" rx="12" fill="${C.burg}" transform="rotate(-12)"/><path d="M-60 -10H40A36 36 0 0 1 40 62H-60Z" fill="URLB"/><circle cx="40" cy="26" r="20" fill="${C.cream}" stroke="${C.burg}" stroke-width="2"/><circle cx="40" cy="26" r="8" fill="none" stroke="${C.burg}" stroke-width="2"/><rect x="-80" y="0" width="22" height="52" rx="4" fill="${C.burg2}"/>` +
    [0, 1, 2].map((i) => `<path d="M-96 ${8 + i * 18}q-16 -6 -32 0t-32 0" fill="none" stroke="${C.burg}" stroke-opacity=".5" stroke-width="2"/>`).join('') + '</g>'
}
function roundBrush(x, y, rot = 30) {
  let s = `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-5" y="20" width="10" height="70" rx="5" fill="${C.burg}"/><rect x="-11" y="-50" width="22" height="72" rx="6" fill="${C.sand}" stroke="${C.burg}" stroke-width="1.5"/>`
  for (let i = 0; i < 8; i++) s += `<line x1="-18" y1="${-44 + i * 9}" x2="18" y2="${-44 + i * 9}" stroke="${C.burg}" stroke-width="1.4"/>`
  return s + '</g>'
}

// ---------- compositions ----------
const dashed = 'stroke-dasharray="4 4"'
const ART = {
  'manucure-pose-capsules': () => frame(hand((x, y, w) => `<path d="${nailPath(x, y - 34, w, 58, 0.5)}" fill="URLB" stroke="${C.burg}" stroke-width="1.5"/>` + sheen(x - w * 0.18, y - 20, 30)) +
    `<path d="${nailPath(324, 196, 26, 52, 0.5)}" fill="${C.cream}" stroke="${C.burg}" stroke-width="2"/>`, { tone: 0 }),
  'manucure-remplissage': () => frame(hand((x, y, w) => `<path d="${nailPath(x, y - 24, w, 48, 0.5)}" fill="URLB" stroke="${C.burg}" stroke-width="1.5"/><rect x="${x - w / 2}" y="${y + 12}" width="${w}" height="12" fill="${C.cream}"/><path d="M${x - w / 2} ${y + 12}H${x + w / 2}" stroke="${C.burg}" stroke-width="1.2" ${dashed}/>`) +
    `<g transform="translate(320 150) rotate(20)"><rect x="-4" y="0" width="8" height="90" rx="4" fill="${C.burg}"/><path d="M-5 0L0 -24L5 0Z" fill="${C.wine}"/></g>`, { tone: 1 }),
  'manucure-gel': () => frame(hand((x, y, w) => `<path d="${nailPath(x, y, w, 26, 0.55)}" fill="${C.wine}" stroke="${C.burg}" stroke-width="1.5"/>` + sheen(x - w * 0.15, y + 5, 14)) + drop(320, 120, 1.3), { tone: 2 }),
  'manucure-semi-permanent': () => frame(hand((x, y, w, i) => i < 3 ? `<path d="${nailPath(x, y, w, 30, 0.5)}" fill="URLB" stroke="${C.burg}" stroke-width="1.5"/>` + sheen(x - w * 0.15, y + 6, 16) : `<path d="${nailPath(x, y, w, 30, 0.5)}" fill="${C.cream}" stroke="${C.burg}" stroke-width="1.5"/>`) + bottle(330, 220, 1.1), { tone: 0 }),
  'manucure-depose': () => frame(hand((x, y, w) => `<path d="${nailPath(x, y, w, 28, 0.5)}" fill="${C.cream}" stroke="${C.burg}" stroke-width="1.6" ${dashed}/>`) + file(296, 250, 360, 110) + sparkle(84, 170, 10, 0.6), { tone: 1 }),
  'pedicure-semi-permanent': () => frame(toes((x, y, w, h) => `<path d="${nailPath(x, y, w, h, 0.45)}" fill="URLB"/>`) + bottle(340, 110, 0.8), { tone: 2 }),
  'pedicure-gel': () => frame(toes((x, y, w, h) => `<path d="${nailPath(x, y, w, h, 0.45)}" fill="${C.wine}"/>` + sheen(x - w * 0.15, y + 3, h * 0.6)) + drop(70, 110, 1.1), { tone: 0 }),
  'pedicure-depose': () => frame(toes((x, y, w, h) => `<path d="${nailPath(x, y, w, h, 0.45)}" fill="${C.cream}" stroke="${C.burg}" stroke-width="1.5" ${dashed}/>`) + file(300, 100, 370, 40), { tone: 1 }),

  'cils-pose-naturelle': () => frame(eye({ count: 20, len: (t) => 24 + Math.sin(t * Math.PI) * 6 }), { tone: 0 }),
  'cils-pose-mixte': () => frame(eye({ count: 30, len: (t, i) => (i % 2 ? 22 : 36) + Math.sin(t * Math.PI) * 6 }), { tone: 1 }),
  'cils-oeil-de-biche': () => frame(eye({ count: 26, len: (t) => 18 + t * t * 42 }), { tone: 2 }),
  'cils-volume-russe': () => frame(eye({ count: 18, fan: 4, len: (t) => 30 + Math.sin(t * Math.PI) * 10 }), { tone: 0 }),
  'cils-remplissage': () => frame(eye({ count: 24, len: (t) => 26 + Math.sin(t * Math.PI) * 8, color: (t, i) => (i % 3 === 0 ? C.rose : C.burg), style: (t, i) => (i % 3 === 0 ? dashed : '') }) + sparkle(318, 214, 12, 0.7), { tone: 1 }),
  'cils-depose': () => frame(eye({ count: 20, len: (t) => 26 + Math.sin(t * Math.PI) * 6, color: C.rose, style: dashed }) +
    `<circle cx="318" cy="222" r="30" fill="${C.cream}" stroke="${C.burg}" stroke-width="2"/><circle cx="318" cy="222" r="20" fill="none" stroke="${C.burg}" stroke-opacity=".3" stroke-width="1.5" stroke-dasharray="2 4"/>`, { tone: 2 }),

  'rehaussement-cils': () => frame(liftedEye(), { tone: 0 }),
  'rehaussement-cils-coloration': () => frame(liftedEye(drop(84, 108, 1.1)), { tone: 1 }),
  'brow-lift': () => frame(browHairs(196, 150, 1.05) + spoolie(326, 196), { tone: 2 }),
  'brow-lift-epilation-coloration': () => frame(browHairs(186, 150, 1) + tweezers(318, 70, 28) + drop(330, 230, 0.9), { tone: 0 }),

  'epilation-visage': () => frame(faceFront(zone('M146 160C150 196 172 226 200 232C228 226 250 196 254 160C240 176 220 182 200 182C180 182 160 176 146 160Z') + zone('M150 96C170 74 230 74 250 96C230 90 170 90 150 96Z')) + spatula(330, 160), { tone: 1 }),
  'epilation-sourcils': () => frame(faceFront(zone('M150 124c14-22 44-20 46-4c-14-6-30-6-46 4ZM204 120c2-16 32-18 46 4c-16-10-32-10-46-4Z')) + tweezers(320, 90, 25), { tone: 2 }),
  'epilation-moustache': () => frame(body('M110 130C150 92 250 92 290 130C300 190 260 246 200 246C140 246 100 190 110 130Z') + zone('M150 156Q200 132 250 156L246 176Q200 160 154 176Z') +
    `<path d="M150 190q25-18 50-8q25-10 50 8q-25 30-50 30q-25 0-50-30Z" fill="${C.wine}"/><path d="M150 190q50 10 100 0" stroke="${C.burg}" stroke-width="2" fill="none"/>` + spatula(334, 150), { tone: 0 }),
  'epilation-aisselles': () => frame(`<circle cx="180" cy="92" r="34" fill="${C.burg}"/>` + body('M110 300C110 230 120 190 150 176L166 170V128H194V170L234 176C240 140 252 80 262 44C268 28 296 30 298 46C298 90 286 150 278 196C276 240 270 270 268 300Z') + zone('M232 176C246 172 266 180 276 198C268 222 248 220 236 204Z') + spatula(334, 120), { tone: 1 }),
  'epilation-demi-bras': () => frame(body(ARM) + zone('M216 123C262 128 290 132 312 130C330 118 352 112 368 116C378 118 378 128 366 130L350 134C366 138 384 142 384 152C384 166 362 172 340 168C326 166 316 162 306 160C276 162 262 172 216 174Z') + `<line x1="214" y1="116" x2="214" y2="180" stroke="${C.burg}" stroke-width="1.6" ${dashed}/>` + spatula(110, 230, -70), { tone: 2 }),
  'epilation-bras-complets': () => frame(body(ARM) + zone(ARM) + spatula(110, 236, -70), { tone: 0 }),
  'epilation-demi-jambes': () => frame(body(LEG) + zone('M240 120C276 132 300 136 322 140C326 112 332 86 344 70C352 60 370 62 372 74C374 100 372 140 366 172C362 188 340 192 326 186C300 184 262 186 240 185Z') + `<line x1="240" y1="112" x2="240" y2="192" stroke="${C.burg}" stroke-width="1.6" ${dashed}/>` + spatula(110, 244, -70), { tone: 1 }),
  'epilation-jambes-completes': () => frame(body(LEG) + zone(LEG) + spatula(110, 248, -70), { tone: 2 }),
  'epilation-dos': () => frame(body('M110 300C116 240 120 190 112 150C104 110 130 76 170 70L200 60L230 70C270 76 296 110 288 150C280 190 284 240 290 300Z') + zone('M130 120C150 96 250 96 270 120C262 180 262 230 268 280H132C138 230 138 180 130 120Z') + `<path d="M200 74V290" stroke="${C.burg}" stroke-opacity=".5" stroke-width="2"/>` + spatula(338, 150), { tone: 0 }),

  'maquillage-simple': () => frame(lipstick(170, 130, 1.25, -8) + brush(258, 170, 22, 1.1) + `<circle cx="300" cy="96" r="22" fill="${C.rose}" opacity=".7"/>`, { tone: 1 }),
  'maquillage-charge': () => frame(palette(80, 150) + brush(290, 180, 25) + lipstick(320, 112, 0.85, 12) + sparkle(110, 100, 10, 0.6), { tone: 2 }),
  'maquillage-mariee': () => frame(`<path d="M120 40Q200 10 280 40L330 290H70Z" fill="${C.cream}" opacity=".7" stroke="${C.burg}" stroke-opacity=".25" stroke-width="1.5"/>` + lipstick(170, 150, 1.15, -10) +
    `<circle cx="258" cy="200" r="40" fill="${C.sand}" stroke="${C.burg}" stroke-width="2.4"/><circle cx="258" cy="200" r="28" fill="${C.cream}"/>` + flower(240, 92, 18) + flower(272, 112, 12) + sparkle(128, 70, 12, 0.7) + sparkle(320, 70, 8, 0.6), { tone: 0 }),

  'coiffure-brushing': () => frame(dryer(214, 120) + roundBrush(320, 196, 35), { tone: 1 }),
  'coiffure-wavy': () => frame(Array.from({ length: 9 }, (_, i) => `<path d="M${120 + i * 20} 30c-40 40 40 70 0 110s40 70 0 110" fill="none" stroke="${i % 3 === 1 ? C.wine : C.burg}" stroke-width="${i % 3 === 1 ? 4 : 7}"/>`).join(''), { tone: 2 }),
  'coiffure-invitee': () => frame(headBack(bun(200, 74, 34) + flower(232, 92, 12) + sparkle(160, 60, 8, 0.8)), { tone: 0 }),
  'coiffure-mariee': () => frame(`<path d="M200 60C260 70 320 160 340 300H60C80 160 140 70 200 60Z" fill="${C.cream}" opacity=".75" stroke="${C.burg}" stroke-opacity=".3" stroke-width="1.5"/>` + headBack(bun(200, 74, 34) + `<path d="M162 66Q200 30 238 66" fill="none" stroke="${C.sand}" stroke-width="6"/>` + [170, 185, 200, 215, 230].map((x, i) => `<circle cx="${x}" cy="${54 - (i === 2 ? 10 : i % 2 ? 4 : 0)}" r="${i === 2 ? 5 : 3.5}" fill="${C.cream}" stroke="${C.burg}" stroke-width="1.4"/>`).join('')), { tone: 1 }),

  'soin-cheveux-courts': () => frame(strands(80, 100) + dropper(332, 190) + drop(300, 120, 0.7), { tone: 2 }),
  'soin-cheveux-longs': () => frame(strands(160, 190) + dropper(336, 196) + drop(70, 120, 0.7), { tone: 0 }),
  'soin-cheveux-extra-longs': () => frame(strands(230, 262, 15) + dropper(340, 196) + drop(64, 110, 0.7) + drop(84, 168, 0.5), { tone: 1 }),
}

mkdirSync('public/prestations', { recursive: true })
for (const s of SERVICES) {
  const art = ART[s.slug]
  if (!art) throw new Error(`no artwork for ${s.slug}`)
  writeFileSync(`public/prestations/${s.slug}.svg`, art())
}
console.log(`${SERVICES.length} illustrations written to public/prestations/`)
