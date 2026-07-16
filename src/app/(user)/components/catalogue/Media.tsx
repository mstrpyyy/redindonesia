'use client'

import { BodyWrapper } from '../BodyWrapper'
import { useInView } from 'react-intersection-observer'
import { useEffect, useState } from 'react'

interface IMediaDevice {
  videoUrl: string
}

export const MediaDevice = ({ videoUrl }: IMediaDevice) => {
  const { ref, entry } = useInView({
    threshold: Array.from({ length: 101 }, (_, i) => i / 100),
  })

  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const handleScale = (val: number) => {
      setScale(val)
    }
    if (entry) {
      const ratio = entry.intersectionRatio
      const calculatedScale = 0.5 + ratio * 0.5
      handleScale(calculatedScale)
    }
  }, [entry])

  return (
    <BodyWrapper className="my-14">
      <section className='flex items-center justify-center'>
        <div
          ref={ref}
          className="w-full lg:max-w-[70vw] rounded-2xl transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${scale})`,
          }}
        >
          <iframe
            loading="lazy"
            className="w-full rounded-xl aspect-video"
            src={videoUrl}
            title="YouTube video"
            allowFullScreen
          />
        </div>
      </section>
    </BodyWrapper>
  )
}
