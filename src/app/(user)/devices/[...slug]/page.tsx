import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { resolveDevicesRoute } from '@/lib/devices-route'
import { getPublicCatalogueCards } from '@/lib/products'
import { getTags } from '@/lib/tags'
import { CATALOGUE_PAGE_SIZE } from '@/app/(user)/components/catalogue/limits'
import { CategoryPageView } from '@/app/(user)/components/catalogue/CategoryPageView'
import { ProductPageView } from '@/app/(user)/components/catalogue/ProductPageView'
import { IHeroSegment } from '@/interfaces/segments'

interface IPageProps {
  params: Promise<{ slug: string[] }>
}

// One catch-all instead of a fixed [category]/[brand]/[product] tree —
// Product.categoryId can point to a category at depth 1-3 (MAX_CATEGORY_DEPTH),
// so a product's URL is 2-4 segments deep depending on where it's filed. See
// DECISIONS.md (supersedes ADR-036's deferred routing question) and the
// `resolveDevicesRoute` doc comment for how a slug path picks between the two.
//
// No `generateStaticParams` — category pages have no static generation today
// by existing precedent, and this route mixes categories and products in one
// file, so enumerating both correctly is separate follow-up work, not an
// oversight.
export async function generateMetadata({ params }: IPageProps): Promise<Metadata> {
  const { slug } = await params
  const resolved = await resolveDevicesRoute('device', slug)
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
  const image = hero?.imgUrl ?? product.thumbnail ?? undefined

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

export default async function DevicesCatchAllPage({ params }: IPageProps) {
  const { slug } = await params
  const resolved = await resolveDevicesRoute('device', slug)
  if (!resolved) notFound()

  if (resolved.kind === 'category') {
    const { category } = resolved
    // A category with no page content of its own (ADR-033) is pure nav
    // structure — reachable only by drilling through the dropdown's nested
    // submenus, never by landing on its own URL.
    if (!category.isPage) redirect('/')

    const urlPrefix = `/devices/${slug.join('/')}`
    const isLeaf = category.children.length === 0

    const [{ items: productCards, hasMore: productCardsHasMore }, tags] = await Promise.all([
      isLeaf
        ? getPublicCatalogueCards('device', { categoryIds: [category.id], limit: CATALOGUE_PAGE_SIZE })
        : Promise.resolve({ items: [], hasMore: false }),
      getTags('device'),
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
