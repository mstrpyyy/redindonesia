import { NavbarBg } from '@/app/(user)/components/navbar/NavbarBg'
import { PageBanner } from '@/app/(user)/components/PageBanner'
import Image from 'next/image'
import React from 'react'

export default function SupportMarcomPromotion() {
  return (
    <main>
      <PageBanner
        defImage={'/image/support/marcom/dummy.jpg'}
        alt='RED (Radian Elok Distriversa) Registration & Documentation Support'
      >
          <span className='text-brand-red2'>Marcom</span>
          {" "}
          <span className='text-white'>& Promotion</span>
      </PageBanner>

      <div className="h-150">

      </div>
    </main>
  )
}