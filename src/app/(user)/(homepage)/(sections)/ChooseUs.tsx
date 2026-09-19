"use client"

import Image from 'next/image'
import type { IHomeFeature } from '@/interfaces/general'
import { resolveFeatureIcon } from '@/lib/feature-icons'
import { HOMEPAGE_EMPTY_PLACEHOLDER } from '@/lib/home-page-constants'

// The stored title is one `<h3>…</h3>` (MiniRichTextEditor "section-title"
// mode) — the editor previews it at `.h3-format`, but this section renders it
// at `.h2-format` (deliberately "unlinked"). Unwrap so the content, accent
// spans included, drops straight into the `<h2>`.
function unwrapHeading(html: string): string {
  return html.replace(/^\s*<h[1-6]\b[^>]*>/i, '').replace(/<\/h[1-6]>\s*$/i, '')
}

export const ChooseUsHomeSection = ({
  title,
  features,
}: {
  title: string | null
  features: IHomeFeature[]
}) => {
  return (
    <section className='flex relative gap-20 py-20'>
      <div className='flex-1'>
        {title ? (
          <h2
            className='mb-10 h2-format'
            dangerouslySetInnerHTML={{ __html: unwrapHeading(title) }}
          />
        ) : (
          <h2 className='mb-10 h2-format'>{HOMEPAGE_EMPTY_PLACEHOLDER}</h2>
        )}

        {features.length > 0 ? (
          features.map((feature, index) => {
            const Icon = resolveFeatureIcon(feature.icon)
            return (
              <div
                key={feature.id}
                className='flex flex-col gap-4 border-t border-t-neutral-200 py-10'
                data-aos="zoom-in-right"
                data-aos-easing="ease-out"
                data-aos-duration="500"
                data-aos-offset="250"
                data-aos-delay={((index % 3) * 100).toString()}
              >
                <div className='flex items-center gap-4'>
                  <Icon size={40} strokeWidth={2} className='text-brand-red shrink-0' />
                  <h3 className='h3-format'>{feature.title || HOMEPAGE_EMPTY_PLACEHOLDER}</h3>
                </div>
                <p className='p-format'>{feature.description || HOMEPAGE_EMPTY_PLACEHOLDER}</p>
              </div>
            )
          })
        ) : (
          <p className='p-format border-t border-t-neutral-200 py-10'>{HOMEPAGE_EMPTY_PLACEHOLDER}</p>
        )}
      </div>

      <div className='flex-1 relative max-lg:hidden'>
        <div className='fixed bottom-0 right-0 h-[45vw] w-[45vw] -z-40'>
          <Image
            alt='Novuma srynge'
            src='/image/home/hand-holding-transparent.webp'
            fill
            priority
            sizes="45vw"
            className='object-contain object-bottom-right'
          />
        </div>
        <div className='fixed bottom-0 right-0 w-full h-full -z-50 bg-secondary' />
      </div>

      <div className='w-screen h-screen fixed top-0 left-0 -z-40' />
    </section>
  )
}
