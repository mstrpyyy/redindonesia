import React from 'react'
import { IconImage } from '../_components/iconImage';
import { RadiantPulse } from '../_components/radiantPulse';
import type { IAboutWorkCard } from '@/interfaces/general'
import { resolveFeatureIcon } from '@/lib/feature-icons'
import { HOMEPAGE_EMPTY_PLACEHOLDER } from '@/lib/home-page-constants'

export const AboutWork = ({
  iconUrl,
  body,
  cards,
}: {
  iconUrl: string | null
  body: string | null
  cards: IAboutWorkCard[]
}) => {
  return (
    <section id='about-work' className=''>
      <div
        className="flex max-lg:justify-center"
        data-aos="fade-left"
        data-aos-duration="600"
      >
        <div className="relative">
          {iconUrl && (
            <IconImage
              src={iconUrl}
              alt='red-work'
              width={1094}
              height={968}
            />
          )}
          <RadiantPulse className='top-16!' />
        </div>
      </div>
      <div className="text-justify">
        {body ? (
          <div
            className="p-format rich-body font-medium!"
            data-aos="fade-up"
            data-aos-duration="600"
            data-aos-delay="150"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <p className="p-format">{HOMEPAGE_EMPTY_PLACEHOLDER}</p>
        )}
        <div className='flex flex-col md:flex-row gap-4 my-10'>
          {cards.map(({ id, icon, title, description }, index) => {
            const Icon = resolveFeatureIcon(icon)
            return (
              <div
                key={id}
                className='flex-1 bg-white shadow-sm rounded-xl px-8 py-6 flex flex-col gap-3'
                data-aos="fade-up"
                data-aos-duration="500"
                data-aos-delay={(index * 100).toString()}
              >
                <Icon size={40} strokeWidth={1.5} className='text-brand-red' />
                <h3 className='text-brand-red h3-sm-format font-semibold'>{title}</h3>
                <p className='p-sm-format'>{description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
