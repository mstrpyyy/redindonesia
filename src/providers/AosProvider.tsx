'use client'

import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function AOSProvider() {
  useEffect(() => {
    AOS.init({
      once: true,
      offset: 0,
      startEvent: 'load',
    })
  }, [])

  return null
}