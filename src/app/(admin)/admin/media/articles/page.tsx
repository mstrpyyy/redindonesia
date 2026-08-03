import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getArticles } from '@/lib/articles'
import { getArticlesPage } from '@/lib/articles-page'
import { IArticle } from '@/interfaces/general'
import { ArticleTable } from './article-table'
import { ArticlesPageForm } from './articles-page-form'

export default async function ArticlesPage() {
  const [articles, page] = await Promise.all([
    getArticles(),
    getArticlesPage('articles'),
  ])

  return (
    <>
      <AdminTitle parent={'Media'} title={'Articles'} />
      <div className="flex flex-col gap-8 mt-6">
        <ArticlesPageForm slug="articles" initialData={page} />
        <hr className="border-t" />
        <ArticleTable articles={articles as IArticle[]} />
      </div>
    </>
  )
}
