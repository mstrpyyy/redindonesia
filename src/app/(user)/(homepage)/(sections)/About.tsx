import { Button } from "@/components/ui/button"
import { ChevronRight, MoveRight, SquareArrowOutUpRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const aboutMenuList = [
  {
    name: 'who',
    href: '/about#about-who',
    bgImgUrl: '/image/about/about-img5.jpg',
    labelImgUrl: '/image/about/red-who-icon.webp'
  },
  {
    name: 'what',
    href: '/about#about-what',
    bgImgUrl: '/image/about/about-img8.jpg',
    labelImgUrl: '/image/about/red-what-icon.webp'
  },
  {
    name: 'what',
    href: '/about#about-work',
    bgImgUrl: '/image/about/about-img1.jpg',
    labelImgUrl: '/image/about/red-work-icon.webp'
  }
]


export const AboutHomeSection = () => {
  return (
    <section className="flex max-lg:flex-col-reverse gap-15">
      {/* MENU */}
      {/* <div className="lg:w-78 xl:w-84 space-y-6 space-x-4 flex flex-col md:flex-row lg:flex-col"> */}
      <div className="gap-y-10 flex flex-col max-sm:items-center sm:flex-row sm:justify-evenly lg:flex-col">
        {aboutMenuList.map((item, index) => (
          <Link
            data-aos="fade-right"
            data-aos-easing="ease-out"
            data-aos-duration="500"
            data-aos-delay={(index*150).toString()}
            key={index}
            href={item.href}
            className="relative group h-28 xs:h-32 lg:h-36 aspect-square"
            // className="relative w-full h-36 sm:h-44 bg-cover bg-center rounded-2xl overflow-hidden shadow-md"
            // style={{ backgroundImage: `url(${item.bgImgUrl})` }}
          >
            {/* <div className="absolute inset-0 bg-linear-to-r from-white from-0% via-white/90 via-50% to-transparent to-100%" /> */}

            <Image
              src={item.labelImgUrl}
              alt={item.name}
              fill
              sizes="300px"
              // className="h-24 lg:h-44 w-auto absolute -translate-y-1/2 top-1/2 left-0 lg:-left-6"
              className="object-contain object-center group-hover:scale-105 transition-all duration-300"
            />
            {/* <div className="absolute right-2 top-2 bg-white/70 text-black flex items-center gap-2 px-2 py-1 rounded-full text-sm font-medium">
              Read
              <SquareArrowOutUpRight strokeWidth={2} size={15} />
            </div> */}
          </Link>
        ))}
      </div>

      {/* ABOUT */}
      <div 
        className="flex-2 flex flex-col justify-between"
        data-aos="fade-zoom-in" 
        data-aos-delay="100"
        data-aos-duration="1000"
      >
        <h2 className="h2-format">
          <span className="text-brand-red text-4xl sm:text-5xl xl:text-6xl 2xl:text-7xl">22 Years</span>
          <br />
          <span className="text-balance block">
            of Excellence in Medical Aesthetics
          </span>
        </h2>

        <p className="p-format max-lg:mb-8 mt-6">
          Since 2004, PT Radian Elok Distriversa has been a cornerstone of Indonesia&apos;s aesthetic industry. With over two decades of expertise, we specialize in the distribution of premium medical aesthetic devices, advanced laser platforms, and high-performance cosmeceuticals. Based in Jakarta, our extensive network bridges world-leading innovators from Europe and the USA with Indonesia&apos;s top plastic surgeons, dermatologists, and aesthetic practitioners.
        </p>

        <div className="max-lg:hidden flex-1 border-l-2 border-l-neutral-300 my-4" />

        <div className="max-lg:ml-auto flex items-center w-full">
          <div className="lg:hidden flex-1 border-t-2 border-t-neutral-300 mr-6" />
          <Button asChild variant="outlineSecondary">
            <Link href="/about">
              About Us
              <MoveRight strokeWidth={1.5} size={30} />
            </Link>
          </Button>
        </div>

      </div>

    </section>
  )
}
