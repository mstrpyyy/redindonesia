"use client"

import { useRef } from "react"
import { useCanvasCursor, type IRgbColor } from "@/hooks/use-canvas-cursor"

interface ICanvasCursorProps {
  color?: IRgbColor
}

export default function CanvasCursor({ color }: ICanvasCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useCanvasCursor(canvasRef, color)

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 hidden md:block"
    />
  )
}
