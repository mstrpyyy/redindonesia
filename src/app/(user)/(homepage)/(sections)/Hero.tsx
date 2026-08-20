import { FacebookOutlinedRounded, InstagramOutlinedRounded, LinkedinOutlinedRounded, TiktokOutlinedRounded } from "@lineiconshq/react-lineicons";

import Link from "next/link";
import { SearchBar } from "@/app/(user)/components/SearchBar";
import { resolveHomeBannerVideoUrls } from "@/lib/home-page";
import { HeroBannerGroup } from "@/app/(user)/components/HeroBannerGroup";

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

interface IHeroHomeSectionProps {
  bannerSmUrl?: string | null;
  bannerSmVideoUrl?: string | null;
  bannerMdUrl?: string | null;
  bannerMdVideoUrl?: string | null;
  bannerLgUrl?: string | null;
  bannerLgVideoUrl?: string | null;
  bannerXlUrl?: string | null;
  bannerXlVideoUrl?: string | null;
  // One global switch (not per-size — ADR-091): each size's video also plays
  // on every smaller size with none of its own, until a smaller size that
  // does have one takes over.
  bannerVideoUseForSmaller?: boolean;
}

export const HeroHomeSection = ({
  bannerSmUrl,
  bannerSmVideoUrl,
  bannerMdUrl,
  bannerMdVideoUrl,
  bannerLgUrl,
  bannerLgVideoUrl,
  bannerXlUrl,
  bannerXlVideoUrl,
  bannerVideoUseForSmaller = false,
}: IHeroHomeSectionProps) => {
  // The waterfall resolution (Xl → Lg → Md → Sm, ADR-091) — a size's own
  // video always wins; it only inherits a larger size's video when it has
  // none of its own and the global switch is on.
  const effectiveVideoUrls = resolveHomeBannerVideoUrls({
    bannerXlVideoUrl: bannerXlVideoUrl ?? null,
    bannerLgVideoUrl: bannerLgVideoUrl ?? null,
    bannerMdVideoUrl: bannerMdVideoUrl ?? null,
    bannerSmVideoUrl: bannerSmVideoUrl ?? null,
    bannerVideoUseForSmaller,
  });

  return (
    <section className="h-svh w-full relative flex flex-col items-center md:items-start bg-black">
      <HeroBannerGroup
        slots={[
          {
            // portrait, width < md
            key: "sm",
            imageUrl: bannerSmUrl,
            videoUrl: effectiveVideoUrls.Sm,
            fallbackImageUrl: "/image/home/hero/herobanner-sm.webp",
            imageAlt: "Alma Harmony hero banner",
            className: "object-cover object-center z-0 hidden portrait:block portrait:md:hidden absolute inset-0 size-full",
          },
          {
            // portrait, width >= md
            key: "md",
            imageUrl: bannerMdUrl,
            videoUrl: effectiveVideoUrls.Md,
            fallbackImageUrl: "/image/home/hero/herobanner-md.webp",
            imageAlt: "Alma Harmony hero banner",
            className: "object-cover object-center z-0 hidden portrait:md:block absolute inset-0 size-full",
          },
          {
            // landscape, width < xl
            key: "lg",
            imageUrl: bannerLgUrl,
            videoUrl: effectiveVideoUrls.Lg,
            fallbackImageUrl: "/image/home/hero/herobanner-lg.webp",
            imageAlt: "Alma Harmony hero banner",
            className: "object-cover object-top z-0 hidden landscape:block landscape:xl:hidden absolute inset-0 size-full",
          },
          {
            // landscape, width >= xl
            key: "xl",
            imageUrl: bannerXlUrl,
            videoUrl: effectiveVideoUrls.Xl,
            fallbackImageUrl: "/image/home/hero/herobanner-xl.webp",
            imageAlt: "Alma Harmony hero banner",
            className: "object-cover object-right z-0 hidden landscape:xl:block absolute inset-0 size-full",
          },
        ]}
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
          <SearchBar
            inputClassName="
              w-full rounded-full pl-4 pr-10 h-12
              text-base! placeholder:text-neutral-300
              border-2 border-white
              transition-all duration-150
            bg-black/20 backdrop-blur-xs
            "
            iconClassName="pointer-events-none absolute right-4 top-1/2 text-white -translate-y-1/2"
            dropdownClassName="left-0 w-full"
          />
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

