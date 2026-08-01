import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getCategoryTree } from '@/lib/categories'
import { CategoryTree } from '../category-tree'

export default async function DevicesPage() {
  const roots = await getCategoryTree('device')

  return (
    <>
      <AdminTitle parent={'Product & Device'} title={'Device Management'} />
      <div className="mt-6">
        <CategoryTree type="device" title="Device Categories" initialRoots={roots} />
      </div>
    </>
  )
}
