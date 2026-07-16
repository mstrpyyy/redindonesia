"use client"

import NextImage from "next/image"
import { useEffect, useRef, useState } from "react"

interface IViewer360 {
  imgUrlTemplate: string
  totalFrames: number
  extension: string
  width?: number
  height?: number
}

export default function Viewer360({
  imgUrlTemplate,
  totalFrames,
  extension,
  width = 600,
  height = 400,
}: IViewer360) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const imagesRef = useRef<HTMLImageElement[]>([])
  const isDragging = useRef(false)
  const startX = useRef(0)
  const accumulatedDelta = useRef(0)
  const animationFrame = useRef<number | null>(null)

  const [currentFrame, setCurrentFrame] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  /* ===============================
     Lazy Load When Visible
  =============================== */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  /* ===============================
     Load Images (Only When Visible)
  =============================== */
  useEffect(() => {
    if (!isVisible) return

    let loadedCount = 0
    const images: HTMLImageElement[] = []

    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image()
      img.src = `${imgUrlTemplate}${i}${extension}`

      img.onload = () => {
        loadedCount++
        if (loadedCount === 1) {
          // Draw first frame immediately
          drawFrame(0, img)
        }
        if (loadedCount === totalFrames) {
          setIsLoaded(true)
        }
      }

      images.push(img)
    }

    imagesRef.current = images
  }, [isVisible, totalFrames, imgUrlTemplate, extension])

  /* ===============================
     Draw Frame
  =============================== */
  const drawFrame = (frameIndex: number, image?: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = image || imagesRef.current[frameIndex]
    if (!img || !img.complete || img.naturalWidth === 0) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  }

  /* ===============================
     Re-render on frame change
  =============================== */
  useEffect(() => {
    if (!isLoaded) return

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current)
    }

    animationFrame.current = requestAnimationFrame(() => {
      drawFrame(currentFrame)
    })

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [currentFrame, isLoaded])

  /* ===============================
     Pointer Events (Mouse + Touch)
  =============================== */
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    startX.current = e.clientX
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault()
    if (!isDragging.current || !isLoaded) return

    const delta = e.clientX - startX.current
    accumulatedDelta.current += delta

    const sensitivity = 8
    const frameChange = Math.floor(accumulatedDelta.current / sensitivity)

    if (frameChange !== 0) {
      setCurrentFrame((prev) =>
        (prev + frameChange + totalFrames) % totalFrames
      )
      accumulatedDelta.current = 0
    }

    startX.current = e.clientX
  }

  const handlePointerUp = () => {
    isDragging.current = false
  }

  /* ===============================
     Render
  =============================== */
  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-4xl"
    >
      {!isVisible && (
        <NextImage
          src={`${imgUrlTemplate}1${extension}`}
          alt="360 preview"
          width={width}
          height={height}
          className="w-full"
        />
      )}

      {/* GUIDE (background layer) */}
      <div className="absolute inset-0 bottom-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none w-[70%] opacity-30">
        <NextImage
          src="/image/360/360guide.png"
          alt="360 guide"
          fill
          className="object-contain object-bottom"
        />
      </div>

      {/* CANVAS (top layer) */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`relative z-10 w-full cursor-grab active:cursor-grabbing touch-none ${
          !isVisible ? "hidden" : ""
        }`}
        onPointerDown={(e) => {
          e.preventDefault()
          handlePointerDown(e)
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )

}
