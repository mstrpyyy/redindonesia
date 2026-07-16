import { PageBanner } from '@/app/(user)/components/PageBanner'

export default function SupportCareer() {
  return (
    <main>
      <PageBanner
        defImage={'/image/support/career/dummy2.jpg'}
        alt='RED (Radian Elok Distriversa) Registration & Documentation Support'
      >
          <span className='text-brand-red2'>RED</span>
          {" "}
          <span className='text-white'>Career</span>
      </PageBanner>

      <div className="h-150">

      </div>
    </main>
  )
}