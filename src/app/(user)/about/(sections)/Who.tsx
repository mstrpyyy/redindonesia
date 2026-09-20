import Image from 'next/image'
import { IconImage } from '../_components/iconImage'
import { RadiantPulse } from '../_components/radiantPulse'
import { LoopingTypeText } from '../_components/loopingTypeText'
import type { IAboutImage } from '@/interfaces/general'
import { HOMEPAGE_EMPTY_PLACEHOLDER } from '@/lib/home-page-constants'

export const AboutWho = ({
  iconUrl,
  body,
  images,
}: {
  iconUrl: string | null
  body: string | null
  images: IAboutImage[]
}) => {
  return (
      <section id='about-who' className="flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className='flex-1 w-full'>
          <div
            className="relative flex max-lg:justify-center"
            data-aos="fade-right"
            data-aos-duration="600"
          >
            <div className="relative">
              {iconUrl && (
                <IconImage
                  src={iconUrl}
                  alt='red-who'
                  width={987}
                  height={968}
                />
              )}

              <RadiantPulse className='top-16!' />
            </div>
          </div>

          <div
            className='p-6 sm:p-8 rounded-xl shadow-sm bg-white'
            data-aos="fade-up"
            data-aos-duration="600"
            data-aos-delay="150"
          >
            <h2 className="h2-sm-format">
              <span>We are </span>
              <LoopingTypeText text='RED Indonesia' className='text-brand-red font-bold' />
            </h2>
            {body ? (
              <div
                className='p-sm-format rich-body mt-2 text-justify'
                dangerouslySetInnerHTML={{ __html: body }}
              />
            ) : (
              <p className='p-sm-format mt-2'>{HOMEPAGE_EMPTY_PLACEHOLDER}</p>
            )}
          </div>
        </div>

        {images.length > 0 && (
          <div className='w-full lg:w-90'>
            <div className='grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-2 gap-3'>
              {images.map((item, n) => (
                <div
                  key={item.id}
                  className='relative overflow-hidden rounded-2xl aspect-square group'
                  data-aos="fade-up"
                  data-aos-duration="500"
                  data-aos-delay={((n + 1) * 100).toString()}
                >
                  <Image
                    src={item.image}
                    alt={`About image ${n + 1}`}
                    fill
                    className='object-cover transition-transform duration-500 group-hover:scale-105'
                    sizes='(max-width: 768px) 50vw, 25vw'
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
  )
}
