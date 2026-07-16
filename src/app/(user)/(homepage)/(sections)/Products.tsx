import { ProductCarousel } from "@/app/(user)/components/Carousels"
import { Button } from "@/components/ui/button"
import { MoveRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface IProductHomeSection {
  title: string
  titleImg?: string
  href: string
  size?: 'sm' | 'md'
  carouselList: {
    img: string
    title: string
    href: string
  }[]
}

export const ProductHomeSection = ({ title, titleImg, href, carouselList, size }: IProductHomeSection) => {
  return (
    <section className="w-full">
      <div className="flex justify-between items-center mb-6 w-full gap-6">
        <h2 className="font-semibold h2-sm-format">
          <span className="sr-only">{title}</span>
          {titleImg ? (
            <div className="relative h-8 w-32">
              <Image src={titleImg} alt="" aria-hidden="true" fill className="object-contain object-left" />
            </div>
          ) : (
            <span aria-hidden="true">{title}</span>
          )}
        </h2>
        <div className="flex-1 border-t-2 border-t-neutral-200" />
        <Button asChild variant={'outlineSecondary'}>
          <Link href={href}>
            See More
            <MoveRight strokeWidth={1.5} size={30} />
          </Link>
        </Button>
      </div>

      <ProductCarousel carouselList={carouselList} size={size ?? 'md'} />
    </section>
  )
}
