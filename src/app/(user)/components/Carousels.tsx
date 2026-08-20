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

// The image + title + subtitle + description card both `BasicCarousel` and
// `CardGrid` render. `BasicCarousel`'s card is a fixed height (a carousel
// track needs every slide the same size) with the description clamped to 3
// lines, shown in full on hover. `CardGrid`'s card (`transparent`) instead
// grows to fit its own content — no card background/shadow, no clamp/hover,
// the description just renders in full and the card expands around it.
function FeatureCard({
  item,
  index,
  fullText,
  showFullText,
  transparent,
}: {
  item: IBasicCarousel
  index: number
  fullText?: number | null
  showFullText?: (index: number | null) => void
  transparent?: boolean
}) {
  return (
    <div
      className={`flex flex-col rounded-4xl p-6 group ${
        transparent ? 'bg-transparent' : 'h-96 shadow-[0_4px_8px_rgba(0,0,0,0.25)] bg-linear-to-b from-brand-peach/20 to-white'
      }`}
    >

      {/* Image Section — fixed aspect box when the card grows to fit its
          content (`transparent`), since `fill` needs a sized ancestor and
          this one no longer has a fixed height to lean on. The carousel's
          fixed-height card instead stretches the image to fill whatever
          space is left (`flex-1 min-h-0`) once the rest of the card's
          content has taken its share. `transparent`'s box also steps down
          gradually from lg (full width) to below sm (smallest) — text stays
          fixed size, only the image shrinks. */}
      <div
        className={
          transparent
            ? 'relative mx-auto aspect-square w-3/5 sm:w-3/4 md:w-5/6 lg:w-full'
            : 'relative w-full flex-1 min-h-0'
        }
      >
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

      {transparent ? (
        <p className="text-sm text-current text-justify">{item.text}</p>
      ) : (
        <p
          onPointerEnter={() => showFullText?.(index)} onPointerLeave={() => showFullText?.(null)}
          className={`text-sm text-neutral-500 text-justify ${fullText === index ? '' : 'line-clamp-3 mt-auto'}`}
        >
          {item.text}
        </p>
      )}

    </div>
  )
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
            <div
              className="p-1"
              data-aos="fade-up"
              data-aos-duration="500"
              data-aos-delay={((index % 4) * 100).toString()}
            >
              <FeatureCard item={item} index={index} fullText={fullText} showFullText={showFullText} />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  )
}

// Same card as `BasicCarousel`, laid out as a wrapping flex grid instead of a
// horizontal slider — up to 4 per row, `justify-center` + `items-start` so a
// trailing partial row centers instead of hugging the left edge (the way a
// CSS grid's last row would) and cards of different description lengths
// don't stretch to match their row's tallest neighbor. The `-ml-6`/`pl-6` and
// `-mt-6`/`pt-6` pairs are the same negative-margin gutter trick
// `BasicCarousel` uses horizontally, just added vertically too since rows
// wrap here.
export const CardGrid = ({ list }: { list: IBasicCarousel[] }) => {
  return (
    <div className="flex flex-wrap justify-center items-start -mt-6 -ml-6 py-2">
      {list.map((item, index) => (
        <div
          key={index}
          className="basis-full pt-6 pl-6 sm:basis-1/2 lg:basis-1/3 2xl:basis-1/4"
          data-aos="fade-up"
          data-aos-duration="500"
          data-aos-delay={((index % 4) * 100).toString()}
        >
          <div className="p-1">
            <FeatureCard item={item} index={index} transparent />
          </div>
        </div>
      ))}
    </div>
  )
}