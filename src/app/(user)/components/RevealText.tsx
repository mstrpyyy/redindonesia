import { cn } from '@/lib/utils'

interface IRevealTextWord {
  text: string
  className?: string
}

interface IRevealText {
  words: IRevealTextWord[]
  className?: string
  wordClassName?: string
  staggerMs?: number
  durationMs?: number
  delayMs?: number
  // Stagger index of this instance's first word — lets a title split across
  // multiple RevealText calls (e.g. wrapped onto its own line) keep counting
  // up from where the previous line left off instead of restarting at 0.
  startIndex?: number
}

// Server component — words render as plain text in the initial HTML (SEO-safe),
// the swipe-in is a pure CSS animation (`.reveal-swipe-in` in globals.css)
// deferred to paint, so nothing needs to hydrate for the text to be crawlable.
export const RevealText = ({
  words,
  className,
  wordClassName,
  staggerMs = 400,
  durationMs = 500,
  delayMs = 0,
  startIndex = 0,
}: IRevealText) => {
  return (
    <span className={className}>
      {words.map((word, index) => (
        <span key={index}>
          {/* `pb-[0.2em] -mb-[0.2em]` — the clip box height comes from the
              inline-block's own line box, which for Tailwind's `text-*xl`
              sizes is a tight `line-height: 1`, cropping descenders (g/y/p/j/q).
              Padding adds room inside the clipped box directly (unlike
              line-height, which doesn't reliably grow a nested inline-block's
              box); the matching negative margin cancels the extra space back
              out so surrounding layout doesn't shift. */}
          <span className='inline-block overflow-hidden pb-[0.2em] -mb-[0.2em]'>
            <span
              className={cn('inline-block reveal-swipe-in', wordClassName, word.className)}
              style={{
                animationDelay: `${delayMs + (startIndex + index) * staggerMs}ms`,
                animationDuration: `${durationMs}ms`,
              }}
            >
              {word.text}
            </span>
          </span>
          {index < words.length - 1 && ' '}
        </span>
      ))}
    </span>
  )
}
