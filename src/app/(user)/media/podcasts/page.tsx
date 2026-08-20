import { PageBanner } from '@/app/(user)/components/PageBanner'
import { BodyWrapper } from '../../components/BodyWrapper'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { getPodcastPage } from '@/lib/podcast-page'
import { getPodcasts } from '@/lib/podcasts'
import { getYoutubeVideoId } from '@/lib/utils'

export default async function MediaPodcasts() {
  const [page, podcasts] = await Promise.all([
    getPodcastPage('podcasts'),
    getPodcasts(),
  ])

  return (
    <main>
      <PageBanner
        defImage={page.bannerXlUrl ?? '/image/media/podcasts/dummy.jpg'}
        mdImage={page.bannerMdUrl ?? undefined}
        smImage={page.bannerSmUrl ?? undefined}
        defVideo={page.bannerXlVideoUrl}
        mdVideo={page.bannerMdVideoUrl}
        smVideo={page.bannerSmVideoUrl}
        videoUseForSmaller={page.bannerVideoUseForSmaller}
        alt='RED (Radian Elok Distriversa) podcast'
      >
        <span className='text-brand-red2'>RED</span>
        {" "}
        <span className='text-white'>Podcasts</span>
      </PageBanner>

      <div className="bg-secondary py-20">
        {podcasts.length === 0 && (
          <BodyWrapper className="py-10">
            <p className="p-format text-center text-pretty">
              No podcasts have been published yet.
            </p>
          </BodyWrapper>
        )}

        {podcasts.map((podcast, index) => {
          const videoId = getYoutubeVideoId(podcast.youtubeUrl)
          if (!videoId) return null

          return (
            <BodyWrapper key={podcast.id} className="py-10">
              <section
                className={`flex max-xl:flex-col gap-10 2xl:gap-20 overflow-hidden body-container-limit ${index % 2 === 1 ? 'xl:flex-row-reverse' : ''}`}
              >
                <div className="flex-1 rounded-2xl">
                  <iframe
                    loading="lazy"
                    className="w-full rounded-xl aspect-video"
                    src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                    title={podcast.title}
                    allowFullScreen
                  />
                </div>

                <div className="xl:w-90 2xl:w-105 text-center text-pretty flex flex-col">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-3xl 2xl:text-4xl font-bold xl:leading-13 xl:text-start text-balance">
                    {podcast.title}
                  </h2>

                  {podcast.description && (
                    <p className="text-lg sm:text-xl mt-2 xl:leading-8 xl:text-justify">
                      {podcast.description}
                    </p>
                  )}

                  <Button asChild className="rounded-full mt-5  w-fit" variant={'outline'}>
                    <a href={podcast.youtubeUrl} target="_blank" rel="noopener noreferrer">
                      Watch on Youtube
                      <ExternalLink />
                    </a>
                  </Button>
                </div>
              </section>
            </BodyWrapper>
          )
        })}
      </div>
    </main>
  )
}
