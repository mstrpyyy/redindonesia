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
  // `bannerXlUrl` (2560x1440, desktop landscape) is the only one required.
  isPage: boolean
  bannerSmUrl: string | null // 1440x2560 — mobile portrait
  bannerMdUrl: string | null // 1536x2048 — tablet portrait
  bannerLgUrl: string | null // 2048x1536 — tablet/small-desktop landscape
  bannerXlUrl: string | null // 2560x1440 — desktop landscape
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
  order: number
  categoryId: string
  segments: IProductSegment[]
  tags: ITag[]
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