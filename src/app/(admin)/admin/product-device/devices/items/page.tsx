import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getCategoryTree } from '@/lib/categories'
import { getProductItems } from '@/lib/products'
import { getTags } from '@/lib/tags'
import { parseItemListSearchParams } from '../../parse-item-list-search-params'
import { ItemTable } from '../../item-table'

interface IPageProps {
  searchParams: Promise<{ q?: string; categories?: string; tags?: string; page?: string; pageSize?: string }>
}

export default async function DeviceItemsPage({ searchParams }: IPageProps) {
  const { search, categoryIds, tagIds, page, pageSize } = parseItemListSearchParams(await searchParams)

  const [{ items, total }, categories, tags] = await Promise.all([
    getProductItems('device', { search, categoryIds, tagIds, page, pageSize }),
    getCategoryTree('device'),
    getTags('device'),
  ])

  return (
    <>
      <AdminTitle parent={'Product & Device'} title={'Device Management'} />
      <div className="mt-6">
        <ItemTable
          type="device"
          title="Devices"
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
