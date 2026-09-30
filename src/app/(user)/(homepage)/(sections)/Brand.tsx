'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Marquee from 'react-fast-marquee'
import { useInView } from 'react-intersection-observer'
import { unwrapHeadingHtml } from '@/lib/utils'
import { HOMEPAGE_EMPTY_PLACEHOLDER } from '@/lib/home-page-constants'
import { IBrand } from '@/interfaces/general'

export const BrandHomeSection = ({ title, brands }: { title: string | null; brands: IBrand[] }) => {
   const { ref: brandRef, inView: brandFullyVisible } = useInView({
    threshold: 1,
  })

  const [certifiedVisible, setCertifiedVisible] = useState(false)

  useEffect(() => {
    const certifiedEl = document.getElementById('certified-component')
    if (!certifiedEl) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setCertifiedVisible(entry.isIntersecting)
      },
      {
        threshold: 0.1,
      }
    )

    observer.observe(certifiedEl)

    return () => observer.disconnect()
  }, [])

  const isWhiteBg = brandFullyVisible || certifiedVisible

  return (
    <section
      ref={brandRef}
      className={`
        py-14 flex flex-col items-center transition-colors duration-700
        ${
          isWhiteBg
            ? 'bg-linear-to-t from-white to-white backdrop-blur-xl'
            : 'bg-linear-to-t from-white to-transparent backdrop-blur-xl'
        }
      `}
    >
      {title ? (
        <h2
          className="h2-format title-limiter text-center mb-10 px-10"
          dangerouslySetInnerHTML={{ __html: unwrapHeadingHtml(title) }}
        />
      ) : (
        <h2 className="h2-format title-limiter text-center mb-10 px-10">
          {HOMEPAGE_EMPTY_PLACEHOLDER}
        </h2>
      )}

      {brands.length > 0 ? (
        <>
          <Marquee
            autoFill
            pauseOnHover
          >
            {brands.map((item) => (
              <MarqueeComponent
                key={item.id}
                item={item}
              />
            ))}
          </Marquee>

          <Marquee
            autoFill
            direction="right"
            pauseOnHover
          >
            {[...brands].reverse().map((item) => (
              <MarqueeComponent
                key={item.id}
                item={item}
              />
            ))}
          </Marquee>
        </>
      ) : (
        <span className="text-4xl text-neutral-400">{HOMEPAGE_EMPTY_PLACEHOLDER}</span>
      )}
    </section>
  )
}


const MARQUEE_ITEM_CLASS = `
    w-28 sm:w-32 md:w-32 lg:w-36 xl:w-44
    ml-12 sm:ml-14 md:ml-32 lg:ml-36 xl:ml-44
    aspect-square hover:bg-neutral-100 rounded-lg px-2
    flex items-center
  `

const MarqueeComponent = ({ item }: { item: IBrand }) => {
  const image = (
    <div className='relative h-full max-h-[50%] w-full'>
      <Image
        src={item.logo}
        alt={item.name}
        fill
        sizes="300px"
        className="object-contain object-center "
      />
    </div>
  )

  if (!item.url) {
    return <div className={MARQUEE_ITEM_CLASS}>{image}</div>
  }

  return (
    <Link href={item.url} className={MARQUEE_ITEM_CLASS}>
      {image}
    </Link>
  )
}
