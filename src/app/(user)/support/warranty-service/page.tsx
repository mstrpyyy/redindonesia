
import { PageBanner } from '@/app/(user)/components/PageBanner'

export default function SupportWarrantyService() {
  return (
    <main>
      <PageBanner
        defImage={'/image/support/warranty/dummy.jpg'}
        alt='RED (Radian Elok Distriversa) Warranty & Service Support'
      >
        <span className='text-brand-red2'>Warranty</span>
        {" "}
        <span className='text-white'>& Service</span>
      </PageBanner>

      <div className="h-150">

      </div>
    </main>
  )
}