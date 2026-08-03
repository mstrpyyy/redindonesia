import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getCategoryTree } from '@/lib/categories'
import { getProductItems } from '@/lib/products'
import { getTags } from '@/lib/tags'
import { parseItemListSearchParams } from '../../parse-item-list-search-params'
import { ItemTable } from '../../item-table'

interface IPageProps {
  searchParams: Promise<{ q?: string; categories?: string; tags?: string; page?: string; pageSize?: string }>
}

export default async function ProductItemsPage({ searchParams }: IPageProps) {
  const { search, categoryIds, tagIds, page, pageSize } = parseItemListSearchParams(await searchParams)

  const [{ items, total }, categories, tags] = await Promise.all([
    getProductItems('product', { search, categoryIds, tagIds, page, pageSize }),
    getCategoryTree('product'),
    getTags('product'),
  ])

  return (
    <>
      <AdminTitle parent={'Product & Device'} title={'Product Management'} />
      <div className="mt-6">
        <ItemTable
          type="product"
          title="Products"
          items={items}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          categoryIds={categoryIds}
          tagIds={tagIds}
          categories={categories}
          tags={tags}
        />
      </div>
    </>
  )
}
