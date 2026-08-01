import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getProductItems } from '@/lib/products'
import { ItemTable } from '../../item-table'

export default async function ProductItemsPage() {
  const items = await getProductItems('product')

  return (
    <>
      <AdminTitle parent={'Product & Device'} title={'Product Management'} />
      <div className="mt-6">
        <ItemTable type="product" title="Products" items={items} />
      </div>
    </>
  )
}
