'use client'

import { brandList } from '@/lib/data'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import Marquee from 'react-fast-marquee'
import { useInView } from 'react-intersection-observer'

export const BrandHomeSection = () => {
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
      <h2 className="h2-format title-limiter text-center mb-10 px-10">
        Meet Our{' '}
        <span className="text-brand-red">Brands</span>
      </h2>

      <Marquee
        autoFill
        pauseOnHover
      >
        {brandList.map((item, index) => (
          <MarqueeComponent
            key={index}
            item={item}
            index={index}
          />
        ))}
      </Marquee>

      <Marquee
        autoFill
        direction="right"
        pauseOnHover
      >
        {brandList.reverse().map((item, index) => (
          <MarqueeComponent
            key={index}
            item={item}
            index={index}
          />
        ))}
      </Marquee>
    </section>
  )
}


const MarqueeComponent = ({item, index}:{item:{src:string, link:string}, index:number}) => {
  return (
    <Link
      key={index}
      href={item.link}
      className={`
          w-28 sm:w-32 md:w-32 lg:w-36 xl:w-44 
          ml-12 sm:ml-14 md:ml-32 lg:ml-36 xl:ml-44
          aspect-square hover:bg-neutral-100 rounded-lg px-2
          flex items-center
        `}
      >
        <div className='relative h-full max-h-[50%] w-full'>
        <Image
          src={item.src}
          alt="brand logo"
          fill
          sizes="300px"
          className="object-contain object-center "
        />
        </div>
    </Link>
  )
}
