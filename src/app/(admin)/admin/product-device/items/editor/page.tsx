import { notFound } from 'next/navigation'
import { getCategoryTree } from '@/lib/categories'
import { getProductById } from '@/lib/products'
import { getTags } from '@/lib/tags'
import { ProductForm } from '../../product-form'

interface IPageProps {
  searchParams: Promise<{ type?: string; id?: string }>
}

export default async function Page({ searchParams }: IPageProps) {
  const { id, type: typeParam } = await searchParams
  const product = id ? await getProductById(id) : null

  if (id && !product) notFound()

  const type = product?.type ?? (typeParam === 'product' ? 'product' : 'device')

  const [categories, tags] = await Promise.all([getCategoryTree(type), getTags(type)])

  return (
    <div className="rounded-md border p-6 shadow-lg">
      <h2 className="h2-md-format mb-6 font-semibold">
        {product ? `Edit ${type === 'device' ? 'Device' : 'Product'}` : `${type === 'device' ? 'Device' : 'Product'} Editor`}
      </h2>
      <ProductForm type={type} categories={categories} tags={tags} product={product ?? undefined} />
    </div>
  )
}
