import { Input } from "@/components/ui/input";
import { FacebookOutlinedRounded, InstagramOutlinedRounded, LinkedinOutlinedRounded, TiktokOutlinedRounded } from "@lineiconshq/react-lineicons";

import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const socialMediaList = [
  {
    href: 'https://www.facebook.com/radianelok/',
    icon: <FacebookOutlinedRounded className='size-8 sm:size-10' />
  },
  {
    href: 'https://www.instagram.com/radian.elok.distriversa/',
    icon: <InstagramOutlinedRounded className='size-8 sm:size-10' />
  },
  {
    href: 'https://www.linkedin.com/company/pt-radian-elok-distriversaa/',
    icon: <LinkedinOutlinedRounded className='size-8 sm:size-10' />
  },
  {
    href: 'https://www.tiktok.com/@radianelok',
    icon: <TiktokOutlinedRounded className='size-8 sm:size-10' />
  }
]

export const HeroHomeSection = () => {
  return (
    <section className="h-svh w-full relative flex flex-col items-center md:items-start bg-black">
      {/* portrait, width < md */}
      <Image
        src="/image/home/hero/herobanner-sm.webp"
        alt="Alma Harmony hero banner"
        fill
        priority
        unoptimized
        sizes="100vw"
        className="object-cover object-center z-0 hidden portrait:block portrait:md:hidden"
      />
      {/* portrait, width >= md */}
      <Image
        src="/image/home/hero/herobanner-md.webp"
        alt="Alma Harmony hero banner"
        fill
        priority
        unoptimized
        sizes="100vw"
        className="object-cover object-center z-0 hidden portrait:md:block"
      />
      {/* landscape, width < xl */}
      <Image
        src="/image/home/hero/herobanner-lg.webp"
        alt="Alma Harmony hero banner"
        fill
        priority
        unoptimized
        sizes="100vw"
        className="object-cover object-top z-0 hidden landscape:block landscape:xl:hidden"
      />
      {/* landscape, width >= xl */}
      <Image
        src="/image/home/hero/herobanner-xl.webp"
        alt="Alma Harmony hero banner"
        fill
        priority
        unoptimized
        sizes="100vw"
        className="object-cover object-right z-0 hidden landscape:xl:block"
      />

      <div 
        className="
          landscape:flex-1 mt-24 portrait:md:mt-44 landscape:my-32 w-full flex flex-col justify-center z-10 
          px-7 sm:px-14 text-white
        "
      >
        <h1 className="text-3xl md:text-5xl font-bold max-lg:text-center portrait:text-center text-brand-red text-shadow-md sm:text-balance w-full lg:w-150 portrait:w-full">Your Complete Medical Aesthetic Partner</h1>
        <h2 className="text-lg md:text-2xl text-pretty mt-2 mb-8 max-lg:text-center portrait:text-center">Powering the Future of Your Practice</h2>
        <div className="relative w-full lg:w-150 portrait:mx-auto">
          <Input 
            className="
              w-full rounded-full pl-4 pr-10 h-12
              text-base! placeholder:text-neutral-300  
              border-2 border-white
              transition-all duration-150
            bg-black/20 backdrop-blur-xs
            " 
            placeholder="Browse Our Products" 
          />
          <Search className="absolute right-4 top-1/2 text-white -translate-y-1/2" size={20} />
        </div>

        <div className="flex max-lg:justify-center portrait:justify-center items-center gap-4 mt-8 w-full lg:w-150 portrait:w-full">
          {/* <p className="p-format text-white/80 font-medium! max-lg:hidden">Visit Us</p> */}
          {/* <div className="border-t border-t-white/80 flex-1 max-lg:hidden" /> */}
          {socialMediaList.map((item, index) => {
            return (
              <SocialMediaButton key={index} href={item.href} icon={item.icon} />
            )
          })
          }
        </div>
      </div>
    </section>
  )
}


const SocialMediaButton = ({href, icon}:{href: string, icon: React.ReactNode}) => {
  return (
    <Link href={href} className="hover:text-brand-red  transition-all duration-100" target="_blank">
      {icon}
    </Link>
  )
}

