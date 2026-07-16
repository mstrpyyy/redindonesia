import { PageBanner } from '@/app/(user)/components/PageBanner'

export default function MediaGalleries() {
  return (
    <main>
      <PageBanner
        defImage={'/image/media/galleries/dummy.jpg'}
        alt='RED (Radian Elok Distriversa) galleries'
      >
        <span className='text-brand-red2'>RED</span>
        {" "}
        <span className='text-white'>Galleries</span>
      </PageBanner>

      <div className="h-150">

      </div>
    </main>
  )
}