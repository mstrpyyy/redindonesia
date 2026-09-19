'use client'

import { Fragment, useEffect, useState } from "react"
import { useInView } from 'react-intersection-observer'
import type { IHomeStatistic } from "@/interfaces/general"
import { HOMEPAGE_EMPTY_PLACEHOLDER } from "@/lib/home-page-constants"

export const StatCounter = ({ stats }: { stats: IHomeStatistic[] }) => {
  const hasData = stats.length > 0
  // Keep the red band rendering even with no CMS data — one cell showing "-".
  const items: IHomeStatistic[] = hasData
    ? stats
    : [{ id: 'placeholder', value: 0, name: HOMEPAGE_EMPTY_PLACEHOLDER }]

  const [counts, setCounts] = useState<number[]>(() => items.map(() => 0))

  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: false,
  })

  useEffect(() => {
    if (!inView || !hasData) return

    const duration = 1500
    const steps = 60
    const stepDuration = duration / steps

    const intervals = items.map((item, index) => {
      const increment = item.value / steps
      let currentStep = 0

      return setInterval(() => {
        currentStep++
        if (currentStep <= steps) {
          setCounts(prev => {
            const next = [...prev]
            next[index] = Math.min(Math.round(increment * currentStep), item.value)
            return next
          })
        }
      }, stepDuration)
    })

    return () => intervals.forEach(clearInterval)
    // `items` is derived from the `stats` prop, stable for the page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, hasData])

  return (
    <section
      ref={ref}
      className='w-full py-8 flex items-center justify-center bg-brand-red text-white'
    >
      <div className="body-container-limit flex max-sm:flex-col items-center justify-center gap-4">
        {items.map((item, index) => (
          <Fragment key={item.id}>
            <div className="flex-1 max-md:text-center">
              <p className="text-5xl sm:text-3xl md:text-4xl lg:text-5xl font-medium">
                {hasData ? `${counts[index].toLocaleString()}+` : HOMEPAGE_EMPTY_PLACEHOLDER}
              </p>
              <p className="text-2xl sm:text-lg md:text-xl font-light">
                {item.name || HOMEPAGE_EMPTY_PLACEHOLDER}
              </p>
            </div>
            {index !== items.length - 1 && (
              <div className="h-10 sm:h-14 md:h-24 border-l border-l-white" />
            )}
          </Fragment>
        ))}
      </div>
    </section>
  )
}
