import { Breadcrumbs } from '@/app/(user)/components/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HeroBannerGroup } from '@/app/(user)/components/HeroBannerGroup'
import { RevealText } from '@/app/(user)/components/RevealText'

// One image per orientation/breakpoint (see ADR-035) rather than one image
// stretched everywhere — mirrors the homepage Hero's sm/md/lg/xl pattern.
// Only `xl` is required; any size an admin left empty falls back to it. Each
// size's optional video (ADR-093) is already resolved through the cascade
// (`resolveCategoryBannerVideoUrls`, src/lib/categories.ts) by the caller —
// this component just renders whatever it's handed.
interface IHeroDeviceBannerUrls {
  sm?: string | null
  smVideo?: string | null
  md?: string | null
  mdVideo?: string | null
  lg?: string | null
  lgVideo?: string | null
  xl: string
  xlVideo?: string | null
}

interface IHeroDevice {
  title: string
  description: string
  imgAlt: string
  // Undefined only for a hero with no banner set yet (e.g. an incomplete
  // draft) — both callers (Category, Product) always pass this once their
  // own Xl banner is set. See ADR-093/ADR-095.
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

  // Long CMS-authored titles (category.title/name, product.name) take
  // noticeably long to finish revealing at the static pages' default
  // stagger/duration — tighten both once the title crosses 20 chars so it
  // still finishes at a reasonable pace.
  const isLongTitle = title.length > 20
  const revealStaggerMs = isLongTitle ? 200 : undefined
  const revealDurationMs = isLongTitle ? 300 : undefined

  return (
    <section className='w-full h-svh relative isolate flex flex-col px-5 sm:px-20 pb-10 bg-black'>
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
            max-md:bottom-[10%] md:top-44 lg:top-40
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
          {/* `title` is CMS-authored (category.title/name or product.name), not a
              fixed set of literal words like the other RevealText callers — split
              on whitespace at render time instead of hardcoding a `words` array. */}
          <RevealText
            words={title.split(/\s+/).filter(Boolean).map((text) => ({ text }))}
            staggerMs={revealStaggerMs}
            durationMs={revealDurationMs}
          />
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
        <HeroBannerGroup
          slots={[
            {
              // portrait, width < md
              key: 'sm',
              imageUrl: bannerUrls.sm,
              videoUrl: bannerUrls.smVideo,
              fallbackImageUrl: bannerUrls.xl,
              imageAlt: imgAlt,
              className: 'object-cover object-center z-0 hidden portrait:block portrait:md:hidden absolute inset-0 size-full',
            },
            {
              // portrait, width >= md
              key: 'md',
              imageUrl: bannerUrls.md,
              videoUrl: bannerUrls.mdVideo,
              fallbackImageUrl: bannerUrls.xl,
              imageAlt: imgAlt,
              className: 'object-cover object-center z-0 hidden portrait:md:block absolute inset-0 size-full',
            },
            {
              // landscape, width < xl
              key: 'lg',
              imageUrl: bannerUrls.lg,
              videoUrl: bannerUrls.lgVideo,
              fallbackImageUrl: bannerUrls.xl,
              imageAlt: imgAlt,
              className: 'object-cover object-center z-0 hidden landscape:block landscape:xl:hidden absolute inset-0 size-full',
            },
            {
              // landscape, width >= xl
              key: 'xl',
              imageUrl: bannerUrls.xl,
              videoUrl: bannerUrls.xlVideo,
              fallbackImageUrl: bannerUrls.xl,
              imageAlt: imgAlt,
              className: 'object-cover object-center z-0 hidden landscape:xl:block absolute inset-0 size-full',
            },
          ]}
        />
      ) : null}
    </section>
  )
}
