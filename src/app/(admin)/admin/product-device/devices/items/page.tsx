import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getProductItems } from '@/lib/products'
import { ItemTable } from '../../item-table'

export default async function DeviceItemsPage() {
  const items = await getProductItems('device')

  return (
    <>
      <AdminTitle parent={'Product & Device'} title={'Device Management'} />
      <div className="mt-6">
        <ItemTable type="device" title="Devices" items={items} />
      </div>
    </>
  )
}
