"use client"

import { useEffect, type RefObject } from "react"

interface ICanvasCursorConfig {
  friction: number
  trails: number
  size: number
  dampening: number
  tension: number
}

interface IPoint {
  x: number
  y: number
}

const CONFIG: ICanvasCursorConfig = {
  friction: 0.5,
  trails: 10,
  size: 25,
  dampening: 0.25,
  tension: 0.98,
}

export interface IRgbColor {
  r: number
  g: number
  b: number
}

export const CANVAS_CURSOR_BRAND_RED: IRgbColor = { r: 231, g: 33, b: 41 } // --color-brand-red

class CursorNode {
  x = 0
  y = 0
  vx = 0
  vy = 0
}

// A spring-connected chain of nodes trailing the pointer — one instance per
// trail, each with slightly randomized spring/friction so the trails fan out
// instead of overlapping exactly.
class CursorLine {
  private spring: number
  private readonly friction: number
  private readonly nodes: CursorNode[] = []

  constructor(spring: number, origin: IPoint) {
    this.spring = spring + 0.1 * Math.random() - 0.02
    this.friction = CONFIG.friction + 0.01 * Math.random() - 0.002
    for (let i = 0; i < CONFIG.size; i++) {
      const node = new CursorNode()
      node.x = origin.x
      node.y = origin.y
      this.nodes.push(node)
    }
  }

  update(target: IPoint): void {
    let spring = this.spring
    const head = this.nodes[0]
    head.vx += (target.x - head.x) * spring
    head.vy += (target.y - head.y) * spring

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i]
      if (i > 0) {
        const prev = this.nodes[i - 1]
        node.vx += (prev.x - node.x) * spring
        node.vy += (prev.y - node.y) * spring
        node.vx += prev.vx * CONFIG.dampening
        node.vy += prev.vy * CONFIG.dampening
      }
      node.vx *= this.friction
      node.vy *= this.friction
      node.x += node.vx
      node.y += node.vy
      spring *= CONFIG.tension
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const current = this.nodes[0]
    let x = current.x
    let y = current.y

    ctx.beginPath()
    ctx.moveTo(x, y)

    for (let i = 1; i < this.nodes.length - 2; i++) {
      const a = this.nodes[i]
      const b = this.nodes[i + 1]
      x = 0.5 * (a.x + b.x)
      y = 0.5 * (a.y + b.y)
      ctx.quadraticCurveTo(a.x, a.y, x, y)
    }

    const secondLast = this.nodes[this.nodes.length - 2]
    const last = this.nodes[this.nodes.length - 1]
    ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y)
    ctx.stroke()
    ctx.closePath()
  }
}

// Ported from the ui-layouts/cursify canvas-cursor effect, rewritten against
// strict TS (the original relies on `@ts-nocheck` and prototype hacks) and a
// canvas ref instead of a DOM id lookup. The original cycled the trail
// through a rainbow hue; this fixes it to a single `color` instead.
export function useCanvasCursor(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  color: IRgbColor = CANVAS_CURSOR_BRAND_RED
): void {
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d") ?? null
    if (!canvas || !ctx) return

    let running = true
    let started = false
    let animationFrameId = 0
    let lines: CursorLine[] = []
    const pos: IPoint = { x: 0, y: 0 }
    const strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`

    function resizeCanvas(): void {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }

    function createLines(): void {
      lines = Array.from(
        { length: CONFIG.trails },
        (_, i) => new CursorLine(0.4 + (i / CONFIG.trails) * 0.025, pos)
      )
    }

    function render(): void {
      if (!running) return
      ctx!.globalCompositeOperation = "source-over"
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx!.globalCompositeOperation = "lighter"
      ctx!.strokeStyle = strokeStyle
      ctx!.lineWidth = 1
      for (const line of lines) {
        line.update(pos)
        line.draw(ctx!)
      }
      animationFrameId = window.requestAnimationFrame(render)
    }

    function setPositionFromEvent(e: MouseEvent | TouchEvent): void {
      if ("touches" in e) {
        pos.x = e.touches[0].pageX
        pos.y = e.touches[0].pageY
      } else {
        pos.x = e.clientX
        pos.y = e.clientY
      }
    }

    function handlePointerMove(e: MouseEvent | TouchEvent): void {
      setPositionFromEvent(e)
      if (!started) {
        started = true
        createLines()
        render()
      }
    }

    function handleTouchStart(e: TouchEvent): void {
      if (e.touches.length === 1) {
        pos.x = e.touches[0].pageX
        pos.y = e.touches[0].pageY
      }
    }

    function handleFocus(): void {
      if (!running) {
        running = true
        render()
      }
    }

    resizeCanvas()
    document.addEventListener("mousemove", handlePointerMove)
    document.addEventListener("touchmove", handlePointerMove)
    document.addEventListener("touchstart", handleTouchStart)
    window.addEventListener("resize", resizeCanvas)
    window.addEventListener("orientationchange", resizeCanvas)
    window.addEventListener("focus", handleFocus)

    return () => {
      running = false
      window.cancelAnimationFrame(animationFrameId)
      document.removeEventListener("mousemove", handlePointerMove)
      document.removeEventListener("touchmove", handlePointerMove)
      document.removeEventListener("touchstart", handleTouchStart)
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("orientationchange", resizeCanvas)
      window.removeEventListener("focus", handleFocus)
    }
  }, [canvasRef, color.r, color.g, color.b])
}
