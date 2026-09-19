import { YoutubeEmbed } from "@/app/(user)/components/YoutubeEmbed"
import { getYoutubeVideoId } from "@/lib/utils"
import { HOMEPAGE_EMPTY_PLACEHOLDER } from "@/lib/home-page-constants"

// The stored title is one `<h3>…</h3>` (MiniRichTextEditor "section-title"
// mode) — unwrap it so its content, including any `<span class="heading-accent">`
// runs, drops straight into this section's own `<h3 className="h3-format">`.
function unwrapHeading(html: string): string {
  return html.replace(/^\s*<h[1-6]\b[^>]*>/i, '').replace(/<\/h[1-6]>\s*$/i, '')
}

export const VideoHomeSection = ({
  title,
  description,
  youtubeUrl,
  thumbnailUrl,
}: {
  title: string | null
  description: string | null
  youtubeUrl: string | null
  thumbnailUrl: string | null
}) => {
  const videoId = youtubeUrl ? getYoutubeVideoId(youtubeUrl) : null

  return (
    <section className="flex flex-col lg:flex-row items-center gap-8 lg:gap-10 justify-between">
      <div className="w-full lg:w-72 xl:w-96 text-center lg:text-justify text-pretty">
        {title ? (
          <h3 className="h3-format max-lg:text-center" dangerouslySetInnerHTML={{ __html: unwrapHeading(title) }} />
        ) : (
          <h3 className="h3-format max-lg:text-center">{HOMEPAGE_EMPTY_PLACEHOLDER}</h3>
        )}

        <p className="text-lg sm:text-xl mt-2 lg:leading-8">
          {description?.trim() || HOMEPAGE_EMPTY_PLACEHOLDER}
        </p>
      </div>

      {/* Same sizing as the About page's shared `VideoTextSection` video —
          `lg:flex-1 lg:max-w-222 aspect-video`. */}
      <div
        data-aos="fade-up"
        data-aos-duration="1000"
        className="w-full lg:flex-1 lg:max-w-222 aspect-video rounded-4xl overflow-hidden"
      >
        {videoId ? (
          <YoutubeEmbed id={videoId} title="Highlight video" thumbnail={thumbnailUrl ?? undefined} />
        ) : (
          <div className="flex size-full items-center justify-center bg-black/10 text-4xl text-neutral-400">
            {HOMEPAGE_EMPTY_PLACEHOLDER}
          </div>
        )}
      </div>
    </section>
  )
}
