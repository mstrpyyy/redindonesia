"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

export const Bumper = () => {
  const [phase, setPhase] = useState<"enter" | "exit" | "hidden">("enter")

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setPhase("exit")
    }, 1000)

    const hideTimer = setTimeout(() => {
      setPhase("hidden")
    }, 2000)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (phase === "hidden") return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      
      {/* White Expanding / Shrinking Circle */}
      <div
        className={`
          bg-white rounded-full aspect-square
          transition-all duration-1000 ease-in-out
          ${phase === "enter" ? "h-[200vw]" : "h-0"}
        `}
      />

      {/* Logo */}
      <div className="absolute flex items-center justify-center">
        <Image
          alt="logo red"
          src="/image/logo-red-black.png"
          width={362}
          height={91}
          className={`w-96 ${phase === "enter" ? "spin-in" : "spin-out"}`}
        />
      </div>
    </div>
  )
}
