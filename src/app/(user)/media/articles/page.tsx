import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PageBanner } from '@/app/(user)/components/PageBanner'
import { RevealText } from '@/app/(user)/components/RevealText'
import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { getArticlePreviewText, getPublishedArticles } from '@/lib/articles'
import { getArticlesPage } from '@/lib/articles-page'
import { formatArticleDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Articles',
  description:
    'News, updates, and insights from PT. Radian Elok Distriversa on medical aesthetic devices, medical laser devices, and cosmoceutical products.',
}

export default async function MediaArticles() {
  const [articles, page] = await Promise.all([
    getPublishedArticles(),
    getArticlesPage('articles'),
  ])

  return (
    <main>
      <PageBanner
        defImage={page.bannerXlUrl ?? '/image/media/articles/dummy2.jpg'}
        mdImage={page.bannerMdUrl ?? undefined}
        smImage={page.bannerSmUrl ?? undefined}
        defVideo={page.bannerXlVideoUrl}
        mdVideo={page.bannerMdVideoUrl}
        smVideo={page.bannerSmVideoUrl}
        videoUseForSmaller={page.bannerVideoUseForSmaller}
        alt='RED (Radian Elok Distriversa) articles'
      >
        <RevealText
          words={[
            { text: 'RED', className: 'text-brand-red2' },
            { text: 'Articles', className: 'text-white' },
          ]}
        />
      </PageBanner>

      <div className="bg-secondary py-10">
        <BodyWrapper className="py-10">
          {articles.length === 0 ? (
            <p className="p-format text-center text-pretty">
              No articles have been published yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/media/articles/${article.slug}`}
                  className="group flex flex-col gap-3"
                  data-aos="fade-up"
                  data-aos-duration="500"
                  data-aos-delay={((index % 3) * 100).toString()}
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-100">
                    {article.coverImage && (
                      <Image
                        src={article.coverImage}
                        alt={article.title || 'Untitled'}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold line-clamp-2">
                      {article.title || 'Untitled'}
                    </h2>
                    {(() => {
                      const previewText = getArticlePreviewText(article)
                      return previewText ? (
                        <p className="text-base text-justify leading-normal text-muted-foreground line-clamp-2 text-pretty">
                          {previewText}
                        </p>
                      ) : null
                    })()}
                    {article.publishedAt && (
                      <span className="text-muted-foreground italic text-xs mt-1">
                        {formatArticleDate(article.publishedAt)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </BodyWrapper>
      </div>
    </main>
  )
}
