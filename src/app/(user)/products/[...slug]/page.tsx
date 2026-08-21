import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { resolveDevicesRoute } from '@/lib/devices-route'
import { getPublicCatalogueCards } from '@/lib/products'
import { getTags } from '@/lib/tags'
import { CATALOGUE_PAGE_SIZE } from '@/app/(user)/components/catalogue/limits'
import { CategoryPageView } from '@/app/(user)/components/catalogue/CategoryPageView'
import { ProductPageView } from '@/app/(user)/components/catalogue/ProductPageView'
import { IHeroSegment } from '@/interfaces/segments'
import { resolveHeroBannerXlUrl } from '@/lib/products'

interface IPageProps {
  params: Promise<{ slug: string[] }>
}

// Products' own version of the `/devices/...` catch-all (ADR-038) — same
// resolver, same view components, just `type: 'product'` and its own
// urlPrefix. See ADR-042 for why this exists now (the navbar's Products
// dropdown needed somewhere for its live-`Category` links to actually land).
//
// No `generateStaticParams` — same reasoning as the Devices route.
export async function generateMetadata({ params }: IPageProps): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveDevicesRoute('product', slug)
  if (!resolved) return { title: 'Not found' }

  if (resolved.kind === 'category') {
    const { category } = resolved
    return {
      title: category.title ?? category.name,
      description: category.description ?? undefined,
    }
  }

  const { product } = resolved
  const hero = product.segments.find((segment): segment is IHeroSegment => segment.type === 'hero')
  const title = product.name
  const description = product.tagline ?? hero?.description ?? undefined
  const image = (hero ? resolveHeroBannerXlUrl(hero) : '') || product.thumbnail || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function ProductsCatchAllPage({ params }: IPageProps) {
  const { slug } = await params
  const resolved = await resolveDevicesRoute('product', slug)
  if (!resolved) notFound()

  if (resolved.kind === 'category') {
    const { category } = resolved
    // A category with no page content of its own (ADR-033) is pure nav
    // structure — reachable only by drilling through the dropdown's nested
    // submenus, never by landing on its own URL.
    if (!category.isPage) redirect('/')

    const urlPrefix = `/products/${slug.join('/')}`

    // Fetched regardless of whether this category has sub-categories — a
    // non-leaf category can still have products filed directly on it
    // (ADR-020), in which case `CategoryPageView` renders both a "Browse
    // Category" grid and a "Browse Catalogue" grid.
    const [{ items: productCards, hasMore: productCardsHasMore }, tags] = await Promise.all([
      getPublicCatalogueCards('product', { categoryIds: [category.id], limit: CATALOGUE_PAGE_SIZE }),
      getTags('product'),
    ])

    return (
      <CategoryPageView
        category={category}
        urlPrefix={urlPrefix}
        productCards={productCards}
        productCardsHasMore={productCardsHasMore}
        tags={tags}
      />
    )
  }

  return <ProductPageView product={resolved.product} />
}
