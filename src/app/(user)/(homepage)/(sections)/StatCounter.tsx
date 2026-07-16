'use client'

import { Fragment, useEffect, useState } from "react"
import { useInView } from 'react-intersection-observer'

const statList = [
  {
    name: 'Years',
    value: 21,
  },
  {
    name: 'Partners',
    value: 12,
  },
  {
    name: 'Professionals',
    value: 100,
  },
  {
    name: 'Products',
    value: 1000,
  },
]

export const StatCounter = () => {
  const [counts, setCounts] = useState(statList.map(() => 0))
  
  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: false,
  })

  useEffect(() => {
    if (!inView) return
    
    const duration = 1500 // 2 seconds
    const steps = 60
    const stepDuration = duration / steps

    const intervals = statList.map((item, index) => {
      const increment = item.value / steps
      let currentStep = 0

      return setInterval(() => {
        currentStep++
        if (currentStep <= steps) {
          setCounts(prev => {
            const newCounts = [...prev]
            newCounts[index] = Math.min(
              Math.round(increment * currentStep),
              item.value
            )
            return newCounts
          })
        }
      }, stepDuration)
    })

    return () => intervals.forEach(clearInterval)
  }, [inView])

  const formatNumber = (num: number, targetValue: number) => {
    if (targetValue >= 1000) {
      return num.toString().padStart(4, '0')
    } else if (targetValue >= 100) {
      return num.toString().padStart(3, '0')
    } else {
      return num.toString().padStart(2, '0')
    }
  }

  return (
    <section 
      ref={ref}
      className='w-full py-8 flex items-center justify-center bg-brand-red text-white'
    >
      <div className="body-container-limit flex max-sm:flex-col items-center justify-center gap-4">
        {statList.map((item, index) => (
          <Fragment key={index}> 
            <div className="flex-1 max-md:text-center">
              <p className="text-5xl sm:text-3xl md:text-4xl lg:text-5xl font-medium">
                {formatNumber(counts[index], item.value)}+
              </p>
              <p className="text-2xl sm:text-lg md:text-xl font-light">{item.name}</p>
            </div>
            {index !== statList.length - 1 &&
              <div className="h-10 sm:h-14 md:h-24 border-l border-l-white" />
            }
          </Fragment>
        ))}
      </div>
    </section>
  )
}   