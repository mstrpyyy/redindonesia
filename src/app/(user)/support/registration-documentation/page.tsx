import { NavbarBg } from '@/app/(user)/components/navbar/NavbarBg'
import { PageBanner } from '@/app/(user)/components/PageBanner'
import Image from 'next/image'
import React from 'react'

export default function SupportRegistrationDocumentation() {
  return (
    <main>

      <PageBanner
        defImage={'/image/support/registration/dummy2.jpg'}
        alt='RED (Radian Elok Distriversa) Registration & Documentation Support'
      >
        <div className='flex flex-col items-center'>
          <span className='text-brand-red2'>Registration</span>
          <span className='text-white'>& Documentation</span>
        </div>
      </PageBanner>

      <div className="h-150">

      </div>
    </main>
  )
}