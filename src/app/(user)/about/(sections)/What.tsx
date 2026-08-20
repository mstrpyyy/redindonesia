import { brandList } from '@/lib/data'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { IconImage } from '../_components/iconImage'
import { RadiantPulse } from '../_components/radiantPulse'

export const AboutWhat = () => {
  return (  
    <section id='about-what' className=''>
      <h2 className="sr-only">What is RED?</h2>
      <div className='flex flex-col lg:flex-row items-start lg:items-center gap-10 lg:gap-20'>
        <div className="p-sm-format text-justify flex-1">
          <div
            className="flex max-lg:justify-center"
            data-aos="fade-right"
            data-aos-duration="600"
          >
            <div className="relative z-10">
              <IconImage
                src={'/image/about/red-what-icon.webp'}
                alt='red-what'
                width={1081}
                height={968}
              />
              <RadiantPulse className='top-16!' />
            </div>
          </div>
          <p className="mt-2" data-aos="fade-up" data-aos-duration="600" data-aos-delay="150">
            At RED Indonesia, we believe that world-class clinical results are born from the perfect synergy between a practitioner&apos;s skill and the technology they wield. We don&apos;t just supply equipment; we cultivate long-term partnerships dedicated to elevating the standards of medical aesthetics in Indonesia.
          </p>
          <p className='mt-2' data-aos="fade-up" data-aos-duration="600" data-aos-delay="250">
            For 22 years, we have acted as a bridge, scouring the globe for &quot;Gold Standard&quot; brands that are clinically proven, not just trendy. We collaborate with the world&apos;s leading brands to maintain the highest possible product quality and comprehensive after-sales service.
          </p>
          <p className='mt-2' data-aos="fade-up" data-aos-duration="600" data-aos-delay="350">
            Think of us as a partner rather than a resource. We share your perspective and work together to achieve your clinical and professional goals.
          </p>
        </div>

        <div className='w-full lg:w-fit mt-auto'>
          <h3
            className='h3-format mb-3 lg:text-right'
            data-aos="fade-left"
            data-aos-duration="600"
          >
            Our Brands
          </h3>
          {/*  <p className='p-sm-format'>
            Strategic partnerships with the world&apos;s leading medical aesthetic brands.
          </p> */}
            <div className='grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 lg:grid-cols-3 justify-items-center gap-3 md:gap-6'>
              {brandList.map((item, index) => {
                return (
                  <Link
                    key={index}
                    href={item.link}
                    className='w-full md:w-28 xl:w-32 block aspect-square bg-white shadow-sm hover:shadow-md transition-shadow rounded-xl relative'
                    data-aos="fade-up"
                    data-aos-duration="500"
                    data-aos-delay={(index * 100).toString()}
                  >
                    <Image
                      src={item.src}
                      alt="brand logo"
                      fill
                      sizes="300px"
                      className="object-contain object-center p-1 xs:p-2 sm:p-3"
                    />
                  </Link>
                )
              })
              }
            </div>
        </div>
      </div>
    </section>
  )
}
