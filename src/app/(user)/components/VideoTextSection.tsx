import { YoutubeEmbed } from './YoutubeEmbed'
import { cn } from '@/lib/utils'

interface IVideoTextSection {
  videoId: string
  videoTitle: string
  thumbnailUrl?: string
  // Both optional — with neither set, the video renders alone (no text
  // column) and naturally takes the full row width.
  heading?: string
  description?: string
  className?: string
}

// Video beside a heading + paragraph, side-by-side on large screens — shared
// by the About page (its own fixed video/copy) and the CMS category page
// (Category.youtube* fields, heading/description optional).
export const VideoTextSection = ({
  videoId,
  videoTitle,
  thumbnailUrl,
  heading,
  description,
  className,
}: IVideoTextSection) => {
  const hasText = Boolean(heading || description)

  return (
    <div className={cn('flex flex-col-reverse lg:flex-row items-center gap-8 lg:gap-10 justify-between', className)}>
      <div
        data-aos="fade-up"
        data-aos-duration="1000"
        className="rounded-4xl overflow-hidden w-full lg:flex-1 aspect-video"
      >
        <YoutubeEmbed id={videoId} title={videoTitle} thumbnail={thumbnailUrl} />
      </div>
      {hasText && (
        <div className="w-full lg:w-96">
          {heading && <h3 className='h3-format max-lg:text-center'>{heading}</h3>}
          {description && (
            <p className='p-sm-format lg:w-0 lg:min-w-full max-lg:text-center!'>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
