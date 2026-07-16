import { PageBanner } from '@/app/(user)/components/PageBanner'

export default function MediaPodcasts() {
  return (
    <main>
      <PageBanner
        defImage={'/image/media/podcasts/dummy.jpg'}
        alt='RED (Radian Elok Distriversa) podcast'
      >
        <span className='text-brand-red2'>RED</span>
        {" "}
        <span className='text-white'>Podcasts</span>
      </PageBanner>

      <div className="h-150">

      </div>
    </main>
  )
}