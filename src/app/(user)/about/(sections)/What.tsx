import { brandList } from '@/lib/data'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { IconImage } from '../_components/iconImage'
import { RadiantPulse } from '../_components/radiantPulse'
import { HOMEPAGE_EMPTY_PLACEHOLDER } from '@/lib/home-page-constants'

export const AboutWhat = ({
  iconUrl,
  body,
}: {
  iconUrl: string | null
  body: string | null
}) => {
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
              {iconUrl && (
                <IconImage
                  src={iconUrl}
                  alt='red-what'
                  width={1081}
                  height={968}
                />
              )}
              <RadiantPulse className='top-16!' />
            </div>
          </div>
          {body ? (
            <div
              className="rich-body mt-2"
              data-aos="fade-up"
              data-aos-duration="600"
              data-aos-delay="150"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          ) : (
            <p className="mt-2">{HOMEPAGE_EMPTY_PLACEHOLDER}</p>
          )}
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
