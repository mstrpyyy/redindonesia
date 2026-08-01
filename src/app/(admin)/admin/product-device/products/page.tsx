import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getCategoryTree } from '@/lib/categories'
import { CategoryTree } from '../category-tree'

export default async function ProductsPage() {
  const roots = await getCategoryTree('product')

  return (
    <>
      <AdminTitle parent={'Product & Device'} title={'Product Management'} />
      <div className="mt-6">
        <CategoryTree type="product" title="Product Categories" initialRoots={roots} />
      </div>
    </>
  )
}
