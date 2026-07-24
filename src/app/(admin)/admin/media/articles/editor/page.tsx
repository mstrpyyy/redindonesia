import { notFound } from 'next/navigation'
import { getArticleById } from '@/lib/articles'
import { IArticle } from '@/interfaces/general'
import { ArticleForm } from './article-form'

interface IPageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function Page({ searchParams }: IPageProps) {
  const { id } = await searchParams
  const article = id ? await getArticleById(id) : null

  if (id && !article) notFound()

  return (
    <div className="border rounded-md shadow-lg p-6">
      <h2 className="h2-md-format font-semibold mb-6">
        {article ? 'Edit Article' : 'Article Editor'}
      </h2>
      <ArticleForm article={(article as IArticle | null) ?? undefined} />
    </div>
  )
}
