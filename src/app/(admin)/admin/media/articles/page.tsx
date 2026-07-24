import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getArticles } from '@/lib/articles'
import { IArticle } from '@/interfaces/general'
import { ArticleTable } from './article-table'

export default async function ArticlesPage() {
  const articles = await getArticles()

  return (
    <>
      <AdminTitle parent={'Media'} title={'Articles'} />
      <div className="mt-6">
        <ArticleTable articles={articles as IArticle[]} />
      </div>
    </>
  )
}
