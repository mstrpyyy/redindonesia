import { resolveCascadingVideoUrls, PAGE_BANNER_SIZE_ORDER } from '@/lib/banner-video'
import { NavbarBg } from './navbar/NavbarBg'
import { PageBannerMedia } from './PageBannerMedia'

interface IPageBanner {
  defImage: string
  mdImage?: string
  smImage?: string
  // Optional mp4 per size (ADR-092, same pattern as the homepage hero —
  // ADR-089/090/091) — when set, that size's image becomes the `<video>`
  // poster and error fallback rather than being replaced.
  defVideo?: string | null
  mdVideo?: string | null
  smVideo?: string | null
  // One global switch (not per-size): each size's video also plays on every
  // smaller size with none of its own, until a smaller size that does have
  // one takes over.
  videoUseForSmaller?: boolean
  alt: string
  children: React.ReactNode
}

export const PageBanner = ({
  defImage,
  smImage,
  mdImage,
  defVideo,
  mdVideo,
  smVideo,
  videoUseForSmaller = false,
  children,
  alt,
}: IPageBanner) => {
  // The waterfall resolution (Xl → Md → Sm, ADR-091/092) — a size's own
  // video always wins; it only inherits a larger size's video when it has
  // none of its own and the global switch is on.
  const effectiveVideoUrls = resolveCascadingVideoUrls(
    PAGE_BANNER_SIZE_ORDER,
    { Xl: defVideo ?? null, Md: mdVideo ?? null, Sm: smVideo ?? null },
    videoUseForSmaller
  )

  return (
    // update
     <section className="h-[65vh] min-h-75 w-full relative isolate bg-black">
      <NavbarBg />
      <PageBannerMedia
        slots={[
          {
            key: 'sm',
            imageUrl: smImage,
            videoUrl: effectiveVideoUrls.Sm,
            fallbackImageUrl: defImage,
            alt,
            className: 'object-cover object-center -z-10 block sm:hidden absolute inset-0 size-full',
          },
          {
            key: 'md',
            imageUrl: mdImage,
            videoUrl: effectiveVideoUrls.Md,
            fallbackImageUrl: defImage,
            alt,
            className: 'object-cover object-center -z-10 hidden sm:block lg:hidden absolute inset-0 size-full',
          },
          {
            key: 'xl',
            imageUrl: defImage,
            videoUrl: effectiveVideoUrls.Xl,
            fallbackImageUrl: defImage,
            alt,
            className: 'object-cover object-center -z-10 hidden lg:block absolute inset-0 size-full',
          },
        ]}
      />
      <div className="absolute left-0 w-full bottom-0 bg-linear-to-t from-black/90 to-transparent z-0 h-2/3"/>

      <h1 className="text-shadow-md absolute bottom-14 left-1/2 -translate-x-1/2 w-full text-center banner-title font-bold text-balance sm:px-10 md:px-20">
        {children}
      </h1>
    </section>
  )
}
