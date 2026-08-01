import { Breadcrumbs } from '@/app/(user)/components/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

// One image per orientation/breakpoint (see ADR-035) rather than one image
// stretched everywhere — mirrors the homepage Hero's sm/md/lg/xl pattern.
// Only `xl` is required; any size an admin left empty falls back to it.
interface IHeroDeviceBannerUrls {
  sm?: string | null
  md?: string | null
  lg?: string | null
  xl: string
}

interface IHeroDevice {
  title: string
  description: string
  imgAlt: string
  // Either a single image (existing hardcoded pages) or the four responsive
  // sizes (Category-backed pages) — exactly one should be passed.
  imgUrl?: string
  bannerUrls?: IHeroDeviceBannerUrls
  children?: React.ReactNode
  heroDocs?: {
    title: string
    href: string
    icon?: React.ReactNode
  }[]
  // Product hero (default): left-aligned, vertically centered in the banner.
  // Category hero: centered horizontally, sitting in the top half instead.
  variant?: 'product' | 'category'
  // Admin-chosen title/description color — a full Tailwind `text-*` class
  // from `getHeroTextColor` in `src/lib/hero-text-colors.ts`. Category pages
  // set this from `Category.heroTextColor` (ADR-045); product/device pages
  // from the hero segment's own `textColor` field (ADR-047). Defaults to the
  // brand peach every hero was hardcoded to before either existed.
  textColorClassName?: string
  // Black or white — `getHeroTextColor(...).contrastClassName`, the same
  // color's own contrast pairing (ADR-048). Used for secondary hero text
  // ("Download Documents") that doesn't need to match the title's exact
  // accent, just stay legible near it.
  contrastClassName?: string
}

export const HeroDevice = ({
  title,
  description,
  imgUrl,
  imgAlt,
  bannerUrls,
  children,
  heroDocs,
  variant = 'product',
  textColorClassName = 'text-brand-peach',
  contrastClassName = 'text-white',
}: IHeroDevice) => {
  // The drop shadow exists to keep light text legible against a variable-
  // brightness photo — only actually needed for white; every other color
  // (including the product hero's own default peach) reads fine without it
  // and looks muddier with a shadow behind it, especially the darker swatches.
  const hasTextShadow = textColorClassName === 'text-white'

  return (
    <section className='w-full h-svh relative flex flex-col px-5 sm:px-20 pb-10'>
      <div className='text-white mt-24 z-30'>
        <Breadcrumbs />
      </div>
      <div 
        className="
          absolute inset-x-0 bottom-0 z-20
          h-1/2 
          block md:hidden
          bg-linear-to-t from-black/70 to-transparent 
        "
      />
      <div 
        className="
          absolute inset-x-0 top-0 z-20
          h-20
          bg-linear-to-b from-black/50 to-transparent 
        "
      />
      <div
        className={cn(
          textColorClassName, 'z-30',
          variant === 'category'
            ? `absolute 
            inset-x-5 sm:inset-x-20 
            max-md:bottom-[5%] md:top-[20%] lg:top-[35%] xl:top-[30%] 
            -translate-y-1/2 
            text-center`
            : 'my-auto'
        )}
      >
        {/* Product hero only — at xl+ the banner is wide enough that a
            full-width title/description reads as an uncomfortably long
            line; capping both to 2/3 of the viewport keeps them readable
            without affecting the category hero's own (already centered,
            narrower) layout. */}
        <h1 className={cn('h1-format', hasTextShadow && 'text-shadow', variant === 'product' && 'xl:max-w-[66.6667vw]')}>
          {title}
        </h1>
        <p className={cn('p-lg-format text-balance mt-2', hasTextShadow && 'text-shadow', variant === 'category' ? 'text-center!' : 'text-left!', variant === 'product' && 'xl:max-w-[66.6667vw]')}>
          {description}
        </p>
        {heroDocs && heroDocs.length > 0 &&
          <div className='mt-2'>
            <p className={cn('text-xs font-medium mb-2', contrastClassName)}>Download Documents</p>
            <div className='flex gap-4 items-center'>
                {heroDocs.map((doc, index) => {
                  return (
                    <Button variant={'glass'} key={index} className=' h-8 gap-2 rounded-full text-xs ' asChild>
                      <a href={doc.href} target='_blank' rel='noopener noreferrer'>
                        {/* `glass`'s own `text-white` (button.tsx, not to be
                            edited) lands on this `<a>` itself via Radix
                            Slot's prop merge — a `className` here would just
                            tie with it at equal specificity. Wrapping the
                            content one level deeper instead overrides
                            through normal nearest-ancestor inheritance, no
                            specificity gamble. */}
                        <span className={cn('inline-flex items-center gap-2', contrastClassName)}>
                          <p className='text-left'>
                            <span className='block font-medium text-xs'>{doc.title}</span>
                          </p>
                          {doc.icon ?
                            doc.icon
                            :
                            <FileDown size={20} strokeWidth={1.5}  />
                          }
                        </span>
                      </a>
                    </Button>
                  )
                })
              }
            </div>
          </div>
        }
      </div>
      {children}

      {bannerUrls ? (
        <>
          {/* portrait, width < md */}
          <Image
            src={bannerUrls.sm ?? bannerUrls.xl}
            alt={imgAlt}
            fill
            priority
            sizes="100vw"
            className='object-cover object-center z-0 hidden portrait:block portrait:md:hidden'
          />
          {/* portrait, width >= md */}
          <Image
            src={bannerUrls.md ?? bannerUrls.xl}
            alt={imgAlt}
            fill
            priority
            sizes="100vw"
            className='object-cover object-center z-0 hidden portrait:md:block'
          />
          {/* landscape, width < xl */}
          <Image
            src={bannerUrls.lg ?? bannerUrls.xl}
            alt={imgAlt}
            fill
            priority
            sizes="100vw"
            className='object-cover object-center z-0 hidden landscape:block landscape:xl:hidden'
          />
          {/* landscape, width >= xl */}
          <Image
            src={bannerUrls.xl}
            alt={imgAlt}
            fill
            priority
            sizes="100vw"
            className='object-cover object-center z-0 hidden landscape:xl:block'
          />
        </>
      ) : imgUrl ? (
        <Image
          src={imgUrl}
          alt={imgAlt}
          fill
          priority
          sizes="100vw"
          className='object-cover object-center z-0'
        />
      ) : null}
    </section>
  )
}
