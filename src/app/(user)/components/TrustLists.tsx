import Image from 'next/image'
import { SOCIAL_MEDIA_LINKS } from './social-media-links'

// Same 4 logos as the homepage's own `CredibilityHomeSection`
// (src/app/(user)/(homepage)/(sections)/Credibility.tsx) — that section has
// its own heading/layout, so it isn't reused directly; this list only
// duplicates the image paths.
const CERTIFICATIONS = [
  { alt: 'bpom', src: '/image/home/certificate/bpom.png', width: 598, height: 683 },
  { alt: 'cdakb', src: '/image/home/certificate/cdakb-black.png', width: 619, height: 300 },
  { alt: 'halal', src: '/image/home/certificate/halal.png', width: 361, height: 646 },
  { alt: 'lkkp', src: '/image/home/certificate/lkkp-black.png', width: 619, height: 300 },
]

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <h3 className='text-center text-sm font-semibold'>{children}</h3>
}

export function CertificationList() {
  return (
    <div className='flex flex-col items-center gap-4'>
      <GroupHeading>Certifications</GroupHeading>
      <div className='flex flex-wrap items-center justify-center gap-4'>
        {CERTIFICATIONS.map((cert) => (
          <div key={cert.alt} className='flex h-10 w-20 items-center justify-center'>
            <Image
              src={cert.src}
              alt={cert.alt}
              width={cert.width}
              height={cert.height}
              className='max-h-full w-auto object-contain'
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Same icons + links as `Footer` (social-media-links.tsx) — not the
// admin-managed `SocialAccount` list, which only backs the Marcom & Promotion
// page's own showcase (ADR-080).
export function SocialMediaList() {
  return (
    <div className='flex flex-col items-center gap-4'>
      <GroupHeading>Social Media</GroupHeading>
      <div className='flex flex-wrap items-center justify-center gap-4'>
        {SOCIAL_MEDIA_LINKS.map((item, index) => (
          <a
            key={index}
            href={item.href}
            target='_blank'
            rel='noopener noreferrer'
            className='text-black hover:text-brand-red flex size-10 shrink-0 items-center justify-center rounded-full transition-colors'
          >
            {item.icon}
          </a>
        ))}
      </div>
    </div>
  )
}

// Certifications and Social Media as two side-by-side groups (`justify-evenly`)
// from md up; stacked and centered below that. Used by every page that shows
// both — Marcom & Promotion renders `CertificationList` on its own instead,
// since it keeps its own dedicated Social Media showcase (ADR-080).
export function TrustSection() {
  return (
    <div className='flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-evenly'>
      <CertificationList />
      <SocialMediaList />
    </div>
  )
}
