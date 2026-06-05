'use client'

import { useEffect } from 'react'

export default function ScrollLockProvider() {
  useEffect(() => {
    document.body.classList.add('overflow-hidden')

    const unlock = () => document.body.classList.remove('overflow-hidden')

    if (document.readyState === 'complete') {
      unlock()
    } else {
      window.addEventListener('load', unlock, { once: true })
    }

    return () => window.removeEventListener('load', unlock)
  }, [])

  return null
}
