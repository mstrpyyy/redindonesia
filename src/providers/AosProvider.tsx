'use client'

import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'

export default function AOSProvider() {
  useEffect(() => {
    document.body.classList.add('overflow-hidden')

    const init = () => {
      AOS.init({
        once: false,
        offset: 0,
      })
      document.body.classList.remove('overflow-hidden')
    }

    if (document.readyState === 'complete') {
      init()
    } else {
      window.addEventListener('load', init, { once: true })
    }

    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href^="#"]') as HTMLAnchorElement | null
      if (!anchor) return
      const hash = anchor.getAttribute('href')!
      const target = document.querySelector(hash)
      if (!target) return
      e.preventDefault()
      target.scrollIntoView({ behavior: 'smooth' })
      history.pushState(null, '', hash)
    }

    document.addEventListener('click', handleAnchorClick)

    return () => {
      window.removeEventListener('load', init)
      document.removeEventListener('click', handleAnchorClick)
      // Never leave the scroll-lock class on <body> (e.g. navigating away
      // before `load` fires) — it would turn <body> into a scroll container
      // and break `position: sticky` elsewhere.
      document.body.classList.remove('overflow-hidden')
    }
  }, [])

  return null
}