import Image from 'next/image'
import { IconImage } from '../_components/iconImage'
import { RadiantPulse } from '../_components/radiantPulse'
import { LoopingTypeText } from '../_components/loopingTypeText'

export const AboutWho = () => {
  return (
      <section id='about-who' className="flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className='flex-1 w-full'>
          <div
            className="relative flex max-lg:justify-center"
            data-aos="fade-right"
            data-aos-duration="600"
          >
            <div className="relative">
              <IconImage
                src={'/image/about/red-who-icon.webp'}
                alt='red-who'
                width={987}
                height={968}
              />

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
            <div className='p-sm-format text-justify'>
              <p className="mt-2 font-medium">
                Radian Elok Distriversa, or commonly known as RED Indonesia, was founded in 2004 with a bold mission: to provide Indonesian practitioners with the highest quality technology and the best medical innovations available globally.
              </p>
              <p className="mt-2">Recognizing the profound expertise of local clinicians, we were driven by a commitment to empower their artistry with advanced technological precision. We didn&apos;t just want to be a trading company; we wanted to redefine the industry.
              </p>
              <p className="mt-2">
                Today, that vision is a reality as we partner with many of the world&apos;s leading brands from Europe and the USA, bringing premier medical aesthetic solutions directly to the Indonesian market.
              </p>
            </div>
          </div>
        </div>

        <div className='w-full lg:w-90'>
          <div className='grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-2 gap-3'>
            {[1,2,3,4,5,6].map((n) => (
              <div
                key={n}
                className='relative overflow-hidden rounded-2xl aspect-square group'
                data-aos="fade-up"
                data-aos-duration="500"
                data-aos-delay={(n * 100).toString()}
              >
                <Image
                  src={`/image/about/who-${n}.webp`}
                  alt={`About image ${n}`}
                  fill
                  className='object-cover transition-transform duration-500 group-hover:scale-105'
                  sizes='(max-width: 768px) 50vw, 25vw'
                />
              </div>
            ))}
          </div>
        </div>

        
      </section>
  )
}
