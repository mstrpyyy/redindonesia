import Image from 'next/image'
import type { IHomeCertification } from '@/interfaces/general'
import { unwrapHeadingHtml } from '@/lib/utils'
import { HOMEPAGE_EMPTY_PLACEHOLDER } from '@/lib/home-page-constants'

const HEADING_CLASS =
  'h2-format text-center text-balance! xl:text-4xl! 2xl:text-5xl! xl:leading-12! 2xl:leading-16!'

export const CredibilityHomeSection = ({
  title,
  certifications,
}: {
  title: string | null
  certifications: IHomeCertification[]
}) => {
  return (
    <section className='flex gap-8 xl:gap-10 2xl:gap-20'>
      <div className='flex-2 my-auto flex flex-col gap-6 md:gap-10 xl:gap-10 2xl:gap-15 items-center'>
        {title ? (
          <h2 className={HEADING_CLASS} dangerouslySetInnerHTML={{ __html: unwrapHeadingHtml(title) }} />
        ) : (
          <h2 className={HEADING_CLASS}>{HOMEPAGE_EMPTY_PLACEHOLDER}</h2>
        )}

        <div className="flex flex-wrap gap-8 xl:gap-12 items-center justify-center my-auto">
          {certifications.length > 0 ? (
            certifications.map((cert, index) => (
              <div
                key={cert.id}
                data-aos="fade-right"
                data-aos-delay={(200 + index * 200).toString()}
                className="relative h-28 w-40 sm:h-32 sm:w-48 xl:h-36 xl:w-56"
              >
                <Image
                  src={cert.image}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 224px, (min-width: 640px) 192px, 160px"
                  className="object-contain"
                />
              </div>
            ))
          ) : (
            <span className="text-4xl text-neutral-400">{HOMEPAGE_EMPTY_PLACEHOLDER}</span>
          )}
        </div>
      </div>
    </section>
  )
}
