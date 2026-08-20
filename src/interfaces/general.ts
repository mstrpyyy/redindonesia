import { ICardBackgroundValue } from '@/lib/card-backgrounds'
import { IProductSegment } from './segments'

export interface INavbarMenu {
  name: string,
  slug: string | null,
  type?: 'largeDropdown' | 'smallDropdown' | 'link'
  menu?: INavbarMenu[]
  // Only set for Category-backed entries (the Devices dropdown) — undefined
  // for the static Products/Support/Media/link entries, which always behave
  // as if this were true. `false` means "just a breadcrumb" (ADR-033) and
  // drops the link-hover underline in LargeDropdown/SidebarDropdown.
  isPage?: boolean
}

export interface ISocialAccount {
  id: string
  platform: string
  label: string
  profileImg: string
  url: string
  order: number
}

export interface IGallery {
  id: string
  title: string
  description: string | null
  images: string[]
  order: number
}

export interface IPodcast {
  id: string
  youtubeUrl: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  order: number
}

export interface ICategory {
  id: string
  type: 'device' | 'product'
  name: string
  slug: string
  depth: number
  order: number
  parentId: string | null
  // A node is either a real page (banners/title/description required, body/
  // youtubeUrl optional) or a plain breadcrumb (all fields null) — see
  // ADR-033. Four banner sizes/orientations rather than one — see ADR-035;
  // `bannerXlUrl` (1920x1080, desktop landscape) is the only one required.
  isPage: boolean
  bannerSmUrl: string | null // 1080x1920 — mobile portrait
  bannerSmVideoUrl: string | null
  bannerMdUrl: string | null // 1080x1440 — tablet portrait
  bannerMdVideoUrl: string | null
  bannerLgUrl: string | null // 1440x1080 — tablet/small-desktop landscape
  bannerLgVideoUrl: string | null
  bannerXlUrl: string | null // 1920x1080 — desktop landscape
  bannerXlVideoUrl: string | null
  // One global switch (not per-size — mirrors HomePage's own ADR-091): each
  // size's video also plays on every smaller size that has none of its own,
  // until a smaller size with its own video takes over — see ADR-093.
  bannerVideoUseForSmaller: boolean
  title: string | null
  description: string | null
  body: string | null
  youtubeUrl: string | null
  // Optional dressing around the YouTube embed — a custom poster image (a
  // missing one falls back to embedding the iframe directly), plus a short
  // caption (h3) and description (p) shown alongside it.
  youtubeThumbnailUrl: string | null
  youtubeCaption: string | null
  youtubeDescription: string | null
  // One of HERO_TEXT_COLOR_VALUES (src/lib/hero-text-colors.ts) — see ADR-045.
  heroTextColor: string | null
  children: ICategory[]
}

export interface IProductListItem {
  id: string
  type: 'device' | 'product'
  name: string
  slug: string
  thumbnail: string | null
  status: 'hidden' | 'public'
  order: number
  category: {
    id: string
    name: string
    parent: {
      id: string
      name: string
      parent: {
        id: string
        name: string
      } | null
    } | null
  }
}

// Search matches `name` only (no other field in this codebase's search yet spans
// multiple columns). `categoryIds`/`tagIds` are OR'd within themselves, AND'd together.
export interface IProductListFilters {
  search?: string
  categoryIds?: string[]
  tagIds?: string[]
  page?: number
  // "all" disables pagination entirely (no `skip`/`take`) — see getProductItems.
  pageSize?: number | 'all'
}

export interface IProductListResult {
  items: IProductListItem[]
  total: number
}

// See ADR-084 — broadens across categories (unlike `getPublishedProductCards`, which is
// hard-scoped to one category with one shared urlPrefix), so each result resolves its
// own URL via `getCategoryAncestry` instead.
export interface IPublicCatalogueFilters {
  search?: string
  categoryIds?: string[]
  tagIds?: string[]
  offset?: number
  limit?: number
}

export interface IPublicCatalogueResult {
  items: IDeviceCardItem[]
  hasMore: boolean
}

// One card in the public device/product catalogue grid. Shared because the
// admin thumbnail editor renders the same card as a live preview.
export interface IDeviceCardItem {
  name: string
  desc: string
  url: string
  imgUrl: string
  /** One of CARD_BACKGROUND_VALUES; anything else falls back to the default tint. */
  background?: ICardBackgroundValue | null
  /** Tag names shown under the tagline — omitted (not just empty) for a category card, which has no tags of its own. */
  tags?: string[]
}

// Scoped to its own `type` — a "Dermatology" product tag and a
// "Dermatology" device tag are two distinct rows, never shared (ADR-041).
export interface ITag {
  id: string
  type: 'device' | 'product'
  name: string
}

export interface IProduct {
  id: string
  type: 'device' | 'product'
  name: string
  slug: string
  tagline: string | null
  thumbnail: string | null
  cardBackground: ICardBackgroundValue | null
  status: 'hidden' | 'public'
  // See ADR-086 — splices this product into its category's navbar dropdown
  // as its own menu item, when also `status: 'public'`.
  showInMenu: boolean
  order: number
  categoryId: string
  // Cross-listing only — `categoryId` above always stays the one that drives
  // this product's own URL (ADR-038). See ADR-085.
  secondaryCategoryIds: string[]
  segments: IProductSegment[]
  tags: ITag[]
}

// One card in a homepage carousel — same {img, title, href} shape
// `ProductCarousel` (src/app/(user)/components/Carousels.tsx) already takes.
// A published device/product available to pick for a "custom" homepage
// carousel item (see ADR-068) — `url` is its real public detail page.
export interface IProductPickerOption {
  id: string
  type: 'device' | 'product'
  name: string
  thumbnail: string | null
  url: string
}

// A category available to pick for a "custom" homepage carousel item,
// alongside individual products/devices above — only categories with
// `isPage: true` qualify, since a category without a page has nowhere for
// `url` to point.
export interface ICategoryPickerOption {
  id: string
  type: 'device' | 'product'
  name: string
  url: string
}

// One "page" suggestion in the site-wide navbar search dropdown
// (SearchBar.tsx) — deliberately broader than the catalogue: a category
// detail page, a published article, or one of the handful of fixed
// support/contact/media-index pages (see src/lib/search.ts).
export interface ISearchPageResult {
  id: string
  label: string
  url: string
  kind: 'category' | 'article' | 'support' | 'contact' | 'media'
}

// Result shape for the navbar search dropdown (see SearchBar.tsx) — two
// independently-gated groups, each capped at a handful of results. `pages`
// stays `[]` below its own (longer) minimum query length even once
// `products` has already started returning matches — see
// MIN_PAGE_SEARCH_QUERY_LENGTH in src/lib/search.ts.
export interface ISearchSuggestions {
  products: IProductPickerOption[]
  pages: ISearchPageResult[]
}

export interface ICarouselItem {
  id: string
  title: string
  img: string
  href: string
  // Set when this item was picked from the catalogue picker (ADR-069) —
  // `img`/`href` are locked to that product in the admin editor. Unused
  // (undefined) for "category" mode's resolved public items.
  productId?: string | null
}

// See ADR-066. "category" mode derives title/items/seeMoreUrl live from
// `categoryId` at render time — `title`/`seeMoreUrl`/`items` are unused in
// that mode. "custom" mode uses `title`/`seeMoreUrl`/`items` directly and
// ignores `categoryId`.
export interface IHomeCarousel {
  id: string
  mode: 'category' | 'custom'
  order: number
  size: 'sm' | 'md'
  showSeeMore: boolean
  categoryId: string | null
  title: string | null
  seeMoreUrl: string | null
  items: ICarouselItem[]
  // "image" swaps the visible heading for `titleImage` — the text title
  // (this row's own `title`, or the linked category's `name` in "category"
  // mode) still renders as a screen-reader-only heading either way, so it's
  // always required regardless of this setting.
  titleDisplayMode: 'text' | 'image'
  titleImage: string | null
}

// Admin list view — `categoryLabel` is the linked category's own name (only
// set for `mode: 'category'`), or null when that category has since been
// deleted (`categoryId` is nulled via `onDelete: SetNull`) so the table can
// surface a "category missing" warning without a second query per row.
export interface IHomeCarouselListItem extends IHomeCarousel {
  categoryLabel: string | null
}

// Fully resolved shape for the public homepage — same fields
// `ProductHomeSection`/`ProductCarousel` already take, whichever mode
// produced them.
export interface IPublicHomeCarousel {
  id: string
  title: string
  titleImage: string | null
  size: 'sm' | 'md'
  seeMoreUrl: string | null
  items: ICarouselItem[]
}

export interface IArticle {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  coverImage: string | null
  status: 'draft' | 'published'
  publishedAt: Date | null
  updatedAt: Date
}