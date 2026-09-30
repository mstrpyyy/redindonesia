import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getBrands, getBrandUrlSuggestions } from '@/lib/brands'
import { BrandTable } from './brand-table'

export default async function BrandsPage() {
  const [brands, urlSuggestions] = await Promise.all([getBrands(), getBrandUrlSuggestions()])

  return (
    <>
      <AdminTitle parent={'Product & Device'} title={'Brand Management'} />
      <div className="mt-6">
        <BrandTable brands={brands} urlSuggestions={urlSuggestions} />
      </div>
    </>
  )
}
