"use client"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

interface ICarouselList {
  img: string
  title: string
  href: string
}

interface ICarousel {
  carouselList: ICarouselList[]
  size?: 'sm' | 'md'
}

export function ProductCarousel({ carouselList, size }: ICarousel) {
  // The non-"md" style is a fully separate Carousel (own CarouselContent/
  // Prev/Next), not a per-item variant — delegate the whole render instead
  // of branching inside the item map below.
  if (size !== 'md') {
    return <CarouselSquare list={carouselList} />
  }

  return (
    <Carousel
      opts={{
        align: "start",
        slidesToScroll: 1,
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-6 py-2">
        {carouselList.map((item, index) => (
          <CarouselItem
            key={index}
            className="
              sm:basis-1/2 pl-6 
              lg:basis-1/3 xl:basis-1/4 
            "
          >
            <div className="p-1">
              <div className={`flex flex-col justify-end h-[450px] z-50 relative`}>
                <div className={`relative w-full flex-1`}>
                  <Image
                    src={item.img}
                    alt={item.title + 'image'}
                    fill
                    className="object-contain object-center z-10"
                    loading="eager"
                  />
                </div>
                <div 
                  className={`relative flex flex-col items-center p-4 pt-0 z-50`}>
                  {/* Text content */}
                  <div className="w-full flex items-center justify-center mt-auto  py-4">
                    <p className={`font-semibold  text-center text-balance ${item.title.length > 22 ? '2xl:text-base' : 'text-sm sm:text-base 2xl:text-lg'}`}>
                      {item.title}
                    </p>
                  </div>
                  <Button variant={'secondary'} asChild className="font-medium w-full inset-shadow-sm rounded-full">
                    <Link href={item.href}>
                      View Details
                    </Link>
                  </Button>
                </div>
                <div 
                  className="
                    absolute bottom-0 h-[60%] w-full
                    shadow-[0_4px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.35)]
                    transition-shadow duration-150 ease-in-out
                  bg-white rounded-4xl -z-10
                  "
                />
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}

function CarouselSquare({list}:{list:ICarouselList[]}) {
  return (
    <Carousel 
      opts={{
        align: "start",
        slidesToScroll: 1,
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-6 py-2">
        {list.map((item, index) => (
          <CarouselItem
            key={index}
            className="
              sm:basis-1/2 pl-6 
              lg:basis-1/3 xl:basis-1/4 
            "
          >
            <div className="p-1">
              <div 
                className={`
                  flex flex-col justify-end relative 
                  shadow-[0_4px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.35)]
                  transition-shadow duration-150 ease-in-out
                bg-white rounded-4xl 
                  
                `}
              >
                <div className={`h-full w-full z-30 -left-[0.5px] pointer-events-none overflow-hidden rounded-4xl`}>
                  <div className={`relative w-full aspect-3/2 mt-4`}>
                    <Image
                      src={item.img}
                      alt={item.title + 'image'}
                      fill
                      className="object-contain object-center"
                      loading="eager"
                    />
                  </div>
                </div>
                <div className={`relative flex flex-col items-center p-4 pt-0`}
                >
                  {/* Text content */}
                  <div className="h-16 w-full flex items-center justify-center mt-auto">
                    <p className={`font-semibold  text-center text-balance ${item.title.length > 22 ? '2xl:text-base' : 'text-sm sm:text-base 2xl:text-lg'}`}>
                      {item.title}
                    </p>
                  </div>
                  <Button variant={'secondary'} asChild className="font-medium w-full inset-shadow-sm rounded-full">
                    <Link href={item.href}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}


interface IBasicCarousel {
  title: string
  subTitle?: string
  imageUrl: string
  text?: string
  href?: string
}

export const BasicCarousel = ({list}:{list:IBasicCarousel[]}) => {
  const [fullText, showFullText] = useState<number | null>(null)
  return (
    <Carousel
      opts={{
        align: "start",
        slidesToScroll: 1,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-6 py-2">

        {list.map((item, index) => (
          <CarouselItem key={index} className="sm:basis-1/2 pl-6 lg:basis-1/3 2xl:basis-1/4">
            <div className="p-1">
              <div className="flex flex-col h-96 rounded-4xl shadow-[0_4px_8px_rgba(0,0,0,0.25)] p-6 group bg-linear-to-b from-brand-peach/20 to-white">

                {/* Image Section - flexible */}
                <div className={`relative w-full flex-1 min-h-0`}>
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-contain object-center"
                  />
                </div>

                {/* Titles */}
                <div className="mt-4 text-center">
                  <h3 className="text-lg font-semibold">
                    {item.title}
                  </h3>
                  <h4 className="text-base font-medium mb-3">
                    {item.subTitle}
                  </h4>
                </div>

                {/* Paragraph pinned bottom */}
                <p
                  onPointerEnter={() => showFullText(index)} onPointerLeave={() => showFullText(null)} 
                  className={`text-sm text-neutral-500 text-justify ${fullText === index ? '' : 'line-clamp-3 mt-auto'}`}
                >
                  {item.text}
                </p>

              </div>
            </div>
          </CarouselItem>



        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}