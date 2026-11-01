import { Seo } from '@/components/layout/Seo'
import { BookingCta } from '@/features/home/sections/BookingCta'
import { ContactPreview } from '@/features/home/sections/ContactPreview'
import { GalleryPreview } from '@/features/home/sections/GalleryPreview'
import { Hero } from '@/features/home/sections/Hero'
import { Intro } from '@/features/home/sections/Intro'
import { SignatureServices } from '@/features/home/sections/SignatureServices'
import { TeamPreview } from '@/features/home/sections/TeamPreview'
import { Testimonials } from '@/features/home/sections/Testimonials'
import { WhyUs } from '@/features/home/sections/WhyUs'

export function HomePage() {
  return (
    <>
      <Seo />
      <Hero />
      <Intro />
      <SignatureServices />
      <WhyUs />
      <GalleryPreview />
      <TeamPreview />
      <Testimonials />
      <ContactPreview />
      <BookingCta />
    </>
  )
}
