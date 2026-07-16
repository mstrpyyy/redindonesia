import { NavbarBg } from '@/app/(user)/components/navbar/NavbarBg'
import { PageBanner } from '@/app/(user)/components/PageBanner'
import Image from 'next/image'
import React from 'react'

export default function Contact() {
  return (
    <main>
      <PageBanner
        defImage={'/image/contact/dummy2.jpg'}
        alt='RED (Radian Elok Distriversa) Registration & Documentation Support'
      >
          <span className='text-brand-red2'>Contact</span>
          {" "}
          <span className='text-white'>Us</span>
      </PageBanner>

      <div className="h-150">

      </div>
    </main>
  )
}