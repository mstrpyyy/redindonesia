"use client"

import { useState } from "react"


export const VideoHomeSection = () => {
  const [play, setPlay] =  useState(false)
  return (
    <section className="flex max-xl:flex-col gap-10 2xl:gap-20 overflow-hidden body-container-limit">  
      <div className="xl:w-90 2xl:w-105 text-center xl:text-justify text-pretty">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-3xl 2xl:text-4xl font-bold xl:leading-13 text-balance">
          Your Strategic Partner in {' '}
          <span className="text-brand-red">
            Aesthetic Innovation.
          </span>
        </h2>

        <p className="text-lg sm:text-xl mt-2 xl:leading-8">
          Providing elite technology and dedicated service to ensure your clinic delivers world-class clinical results.
        </p>
      </div>

      <div className="flex-1 rounded-2xl">
        <iframe
          loading="lazy"  
          className="w-full rounded-xl aspect-video"
          src="https://www.youtube-nocookie.com/embed/CAwiqMRYGqM"
          title="YouTube video"
          allowFullScreen
        />
      </div>

      
    </section>
  )
}
