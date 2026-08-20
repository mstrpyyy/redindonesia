"use client"

import { TypeAnimation } from 'react-type-animation'

interface ILoopingTypeText {
  text: string
  className?: string
}

// `preRenderFirstString` (default true) statically renders `text` in the
// initial HTML — that's the SEO/crawler-visible content, present regardless
// of JS. Only the delete-and-retype loop after that first appearance is
// client-side animation, so nothing textual depends on it actually running.
export const LoopingTypeText = ({ text, className }: ILoopingTypeText) => {
  return (
    <TypeAnimation
      sequence={[text, 2000, '', 800]}
      wrapper='span'
      speed={50}
      deletionSpeed={60}
      repeat={Infinity}
      className={className}
    />
  )
}
