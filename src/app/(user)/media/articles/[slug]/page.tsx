import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NavbarBg } from '@/app/(user)/components/navbar/NavbarBg'
import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { getOtherPublishedArticles, getPublishedArticleBySlug, getPublishedArticleSlugs } from '@/lib/articles'
import { formatArticleDate } from '@/lib/utils'

interface IPageProps {
  params: Promise<{ slug: string }>
}

// Prerenders every published article at build time (SSG) — fastest possible
// delivery and fully crawlable without waiting on a request. Articles
// published afterward still resolve on first request (dynamicParams defaults
// to true) and get cached from then on; edits/unpublishes/deletes revalidate
// this specific path via `revalidateArticlePages(slug)` in the admin actions.
export async function generateStaticParams() {
  const articles = await getPublishedArticleSlugs()
  return articles.map((article) => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: IPageProps): Promise<Metadata> {
  const { slug } = await params
  const article = await getPublishedArticleBySlug(slug)
  if (!article) return { title: 'Article not found' }

  const title = article.title || 'Untitled'
  const description = article.excerpt ?? undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: article.publishedAt?.toISOString(),
      images: article.coverImage ? [{ url: article.coverImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  }
}

export default async function ArticleDetailPage({ params }: IPageProps) {
  const { slug } = await params
  const article = await getPublishedArticleBySlug(slug)

  // A draft's (or deleted article's) slug 404s publicly even with the exact
  // correct URL — `getPublishedArticleBySlug` only ever matches `status: "published"`.
  if (!article) notFound()

  const title = article.title || 'Untitled'
  const otherArticles = await getOtherPublishedArticles(slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: article.excerpt ?? undefined,
    image: article.coverImage ? [article.coverImage] : undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
  }

  return (
    <main>
      <script
        type="application/ld+json"
        // Structured data for search engines (article rich results) — the
        // object above is server-generated from trusted DB fields, not user
        // input, so no injection risk in stringifying it here.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* This page has no hero banner, so the fixed navbar is transparent
          with white text over the plain page background for the first
          ~100px of scroll (see Navbar.tsx `isWhiteNav`). This strip stands
          in for the banner's dark backdrop just long enough to keep the
          logo/menu legible until the navbar switches to its solid state. */}
      <div className="relative h-20 w-full bg-neutral-900">
        <NavbarBg />
      </div>

      <div className="bg-secondary py-10">
        <BodyWrapper className="py-10">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <article className="flex flex-col gap-6 lg:col-span-2">
              <Link href="/media/articles" className="text-muted-foreground text-sm hover:underline">
                &larr; Back to articles
              </Link>

              <div className="flex flex-col gap-3">
                <h1 className="h2-format">{title}</h1>
                {article.publishedAt && (
                  <span className="text-muted-foreground text-sm">
                    {formatArticleDate(article.publishedAt)}
                  </span>
                )}
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-100">
                <Image
                  src={article.coverImage ?? '/image/media/articles/dummy2.jpg'}
                  alt={title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                  priority
                />
              </div>

              {article.excerpt && (
                <p className="p-format text-pretty">{article.excerpt}</p>
              )}

              {/* Admin-authored HTML from the Tiptap editor, not user-submitted —
                  safe to render directly. `.tiptap-content` (globals.css) provides
                  the same heading/list/blockquote/image styling as the editor. */}
              <div
                className="tiptap-content"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            </article>

            <aside className="flex flex-col gap-4">
              <h2 className="h3-sm-format">Other Articles</h2>
              {otherArticles.length === 0 ? (
                <p className="text-muted-foreground text-sm">No other articles yet.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {otherArticles.map((other) => (
                    <li key={other.id}>
                      <Link href={`/media/articles/${other.slug}`} className="group flex gap-3">
                        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                          {other.coverImage && (
                            <Image
                              src={other.coverImage}
                              alt={other.title || 'Untitled'}
                              fill
                              sizes="112px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className="text-sm font-medium line-clamp-2 group-hover:underline">
                            {other.title || 'Untitled'}
                          </h3>
                          {other.publishedAt && (
                            <span className="text-muted-foreground text-xs">
                              {formatArticleDate(other.publishedAt)}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        </BodyWrapper>
      </div>
    </main>
  )
}
