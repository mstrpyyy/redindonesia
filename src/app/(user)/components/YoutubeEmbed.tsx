"use client"

import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'

interface IYoutubeEmbed {
  id: string
  title: string
  thumbnail?: string
}

// Lazy-loaded YouTube embed (poster + click-to-play, via
// react-lite-youtube-embed) — shared by any section that needs a video
// instead of hand-rolling its own instance. Scroll-entrance animation is the
// caller's concern (e.g. `VideoTextSection`'s `data-aos` wrapper).
export const YoutubeEmbed = ({ id, title, thumbnail }: IYoutubeEmbed) => {
  return (
    <div>
      <LiteYouTubeEmbed
        id={id}
        title={title}
        lazyLoad
        thumbnail={thumbnail}
      />
    </div>
  )
}
