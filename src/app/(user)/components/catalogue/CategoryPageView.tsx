import { HeroDevice } from './Hero'
import { VideoTextSection } from '../VideoTextSection'
import { DeviceFilterList } from './DeviceList'
import { BodyWrapper } from '../BodyWrapper'
import { ICategory, IDeviceCardItem } from '@/interfaces/general'
import { getYoutubeVideoId, hasRichTextContent } from '@/lib/utils'
import { getHeroTextColor } from '@/lib/hero-text-colors'

interface ICategoryPageViewProps {
  category: ICategory
  // The current page's own path, e.g. "/devices/medical-aesthetic-devices" —
  // child-category and product cards link to `${urlPrefix}/${slug}`.
  urlPrefix: string
  // Public products directly assigned to this category — only rendered
  // when the category has no sub-categories of its own (see the page.tsx
  // callers, which only fetch these for a leaf node).
  productCards: IDeviceCardItem[]
}

// Shared by both `/devices/[category]/page.tsx` and
// `/devices/[category]/[brand]/page.tsx` — a `Category` row renders the same
// way regardless of depth: its own hero/body/video when `isPage` (ADR-033),
// then either a grid of its sub-categories or, for a leaf, its own products.
export const CategoryPageView = ({ category, urlPrefix, productCards }: ICategoryPageViewProps) => {
  const hasChildren = category.children.length > 0

  const childCards: IDeviceCardItem[] = category.children.map((child) => ({
    name: child.name,
    desc: child.description ?? '',
    url: `${urlPrefix}/${child.slug}`,
    imgUrl: child.bannerXlUrl ?? '',
  }))

  const videoId = category.youtubeUrl ? getYoutubeVideoId(category.youtubeUrl) : null
  // A Tiptap editor left untouched still saves as `<p></p>`, not `""` — a
  // raw truthiness check on `category.body` would count that as "has
  // content" and render a visibly empty rich text block.
  const bodyHtml = category.body && hasRichTextContent(category.body) ? category.body : null

  // Callers (`[category]/page.tsx`, `[category]/[brand]/page.tsx`) already
  // redirect home for a non-page category (ADR-033) before rendering this —
  // by the time we get here, `isPage` is always true.
  return (
    <main>
      <HeroDevice
        variant='category'
        title={category.title ?? category.name}
        description={category.description ?? ''}
        imgAlt={category.title ?? category.name}
        textColorClassName={getHeroTextColor(category.heroTextColor).className}
        bannerUrls={category.bannerXlUrl ? {
          sm: category.bannerSmUrl,
          md: category.bannerMdUrl,
          lg: category.bannerLgUrl,
          xl: category.bannerXlUrl,
        } : undefined}
      />

      {/* Gated on body OR video, not just body — a category with only a
          YouTube video and no rich text still gets this section, and one
          with neither never renders an empty gradient box. */}
      {(bodyHtml || videoId) && (
        <BodyWrapper className='radial-gradient2 py-20 shadow-md relative z-10'>
          {/* Admin-authored HTML from the category's rich text editor —
              same trusted-source precedent as the article detail page.
              `tiptap-content-category` overrides h2/p to the site's
              h2-format/p-format type scale (globals.css). */}
          {bodyHtml && (
            <div className='tiptap-content tiptap-content-category' dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          )}
          {videoId && (
            <VideoTextSection
              className="min-h-[90vh] portrait:my-0 portrait:mt-14"
              videoId={videoId}
              videoTitle={category.youtubeCaption ?? 'YouTube video'}
              thumbnailUrl={category.youtubeThumbnailUrl ?? undefined}
              heading={category.youtubeCaption ?? undefined}
              description={category.youtubeDescription ?? undefined}
            />
          )}
        </BodyWrapper>
      )}

      <BodyWrapper className="bg-secondary">
        <DeviceFilterList
          deviceList={hasChildren ? childCards : productCards}
          heading={hasChildren ? 'Browse Categories' : undefined}
          emptyMessage={hasChildren ? 'No sub-categories yet.' : 'No products available yet.'}
        />
      </BodyWrapper>
    </main>
  )
}
