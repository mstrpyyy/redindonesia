import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { IconImage } from '../_components/iconImage'
import { RadiantPulse } from '../_components/radiantPulse'
import { HOMEPAGE_EMPTY_PLACEHOLDER } from '@/lib/home-page-constants'
import { IBrand } from '@/interfaces/general'

const BRAND_TILE_CLASS =
  'w-full md:w-28 xl:w-32 block aspect-square bg-white shadow-sm hover:shadow-md transition-shadow rounded-xl relative'

export const AboutWhat = ({
  iconUrl,
  body,
  brands,
}: {
  iconUrl: string | null
  body: string | null
  brands: IBrand[]
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
          {brands.length > 0 ? (
            <div className='grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-4 lg:grid-cols-3 justify-items-center gap-3 md:gap-6'>
              {brands.map((item, index) => (
                <BrandTile key={item.id} item={item} index={index} />
              ))}
            </div>
          ) : (
            <p className='text-sm text-neutral-400 lg:text-right'>{HOMEPAGE_EMPTY_PLACEHOLDER}</p>
          )}
        </div>
      </div>
    </section>
  )
}

const BrandTile = ({ item, index }: { item: IBrand; index: number }) => {
  const image = (
    <Image
      src={item.logo}
      alt={item.name}
      fill
      sizes="300px"
      className="object-contain object-center p-1 xs:p-2 sm:p-3"
    />
  )

  if (!item.url) {
    return (
      <div
        className={BRAND_TILE_CLASS}
        data-aos="fade-up"
        data-aos-duration="500"
        data-aos-delay={(index * 100).toString()}
      >
        {image}
      </div>
    )
  }

  return (
    <Link
      href={item.url}
      className={BRAND_TILE_CLASS}
      data-aos="fade-up"
      data-aos-duration="500"
      data-aos-delay={(index * 100).toString()}
    >
      {image}
    </Link>
  )
}
