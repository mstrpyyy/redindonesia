import { PageBanner } from '@/app/(user)/components/PageBanner'

export default function MediaArticles() {
  return (
    <main>
      <PageBanner
        defImage={'/image/media/articles/dummy.jpg'}
        alt='RED (Radian Elok Distriversa) articles'
      >
          <span className='text-brand-red2'>RED</span>
        {" "}
        <span className='text-white'>Articles</span>
      </PageBanner>

      <div className="h-150"></div>
    </main>
  )
}