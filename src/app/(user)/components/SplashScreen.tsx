"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// Plays on every mount, no once-per-session gating — since `(user)/layout.tsx`
// (where this lives) doesn't remount on client-side `Link` navigation, only
// on an actual full page load, this still means "every reload," never every
// click between pages, with no sessionStorage bookkeeping needed to get there.

// Sequential timings (ms from mount): the icon spins in alone first (its own
// 1.3s animation, started immediately on mount — see `.splash-logo-spin-in`
// below), then the wordmark reveals beside it as the spin settles, then it
// holds briefly before the whole overlay fades out.
const TEXT_AT = 1100
const EXIT_AT = 2700
const EXIT_DURATION = 500

// TEMP: forces the splash to always render, fully revealed, and skips the
// session gating/auto-hide entirely — for manually styling it in the
// browser without waiting or re-triggering sessionStorage. Set back to
// `false` before shipping.
const FORCE_ALWAYS_VISIBLE = false

export default function SplashScreen() {
  const [isTextRevealed, setIsTextRevealed] = useState(FORCE_ALWAYS_VISIBLE)
  const [isExiting, setIsExiting] = useState(false)
  // Visible from the first frame — both the server render and the client's
  // first (pre-hydration) paint show the overlay, so it covers the real
  // page's own SSR HTML (Navbar, Hero, everything) from the very start
  // instead of that content flashing in first and getting covered a beat
  // later once React hydrates.
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    if (FORCE_ALWAYS_VISIBLE) return

    document.body.classList.add("overflow-hidden")

    const timers = [
      setTimeout(() => setIsTextRevealed(true), TEXT_AT),
      setTimeout(() => setIsExiting(true), EXIT_AT),
      setTimeout(() => {
        setIsHidden(true)
        document.body.classList.remove("overflow-hidden")
      }, EXIT_AT + EXIT_DURATION),
    ]

    return () => {
      timers.forEach(clearTimeout)
      document.body.classList.remove("overflow-hidden")
    }
  }, [])

  if (isHidden) return null

  return (
    <div
      className={cn(
        // Explicit viewport units (not `inset-0`) so the box is always sized
        // to the visible screen — `inset-0` resolves its height as a
        // percentage of the nearest positioned/transformed ancestor's box,
        // which can end up being the full scrollable page instead of the
        // viewport depending on ancestor layout; `h-dvh`/`w-screen` are
        // viewport-relative units and can't inherit a page-height box.
        "fixed top-0 left-0 z-60 flex h-dvh w-screen items-center justify-center bg-white px-6",
        isExiting && "splash-fade-out"
      )}
    >
      {/* Nudged above dead-center rather than filling the exact viewport
          middle — reads better against the white field than perfect
          centering. */}
      <div className="flex items-center justify-center gap-0">
        <Image
          alt=""
          src="/image/red-logo-only.png"
          width={595}
          height={595}
          priority
          className="splash-logo-spin-in shrink-0 opacity-0 size-36 xs:size-44 md:size-60"
        />
        {/* A `grid-template-columns: 0fr → 1fr` track (not a fixed max-width)
            so the column grows to exactly the text's own natural width, not
            a guessed cap — a fixed cap wider than the content kept animating
            after the text was already fully visible, reading as the reveal
            "abruptly stopping" and then the (still-centering) group
            "slowly sliding" the rest of the way. Growing to the exact
            content width means the wipe and the group's recentering finish
            at the same instant, in one motion. `min-w-0` on the grid item
            is required for it to actually shrink to the 0fr track (grid
            items default to `min-width: auto`, which would otherwise floor
            it at the content's width and block the collapse). */}
        <div
          className={cn(
            "grid transition-[grid-template-columns] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]",
            isTextRevealed ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
          )}
        >
          <div className="flex min-w-0 flex-col items-start overflow-hidden leading-tight whitespace-nowrap">
            <span className="font-medium  text-black text-xl xs:text-2xl md:text-4xl">Radian Elok</span>
            <span className="font-medium  text-black text-xl xs:text-2xl md:text-4xl pl-10 md:pl-11">Distriversa</span>
          </div>
        </div>
      </div>
    </div>
  )
}
