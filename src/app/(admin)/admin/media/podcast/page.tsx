import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getPodcastPage } from '@/lib/podcast-page'
import { getPodcasts } from '@/lib/podcasts'
import { PodcastPageForm } from './podcast-page-form'
import { PodcastTable } from './podcast-table'

export default async function PodcastPage() {
  const [page, podcasts] = await Promise.all([
    getPodcastPage('podcasts'),
    getPodcasts(),
  ])

  return (
    <>
      <AdminTitle parent={'Media'} title={'Podcast'} />
      <div className="flex flex-col gap-8">
        <PodcastPageForm slug="podcasts" initialData={page} />
        <hr className="border-t" />
        <PodcastTable podcasts={podcasts} />
      </div>
    </>
  )
}
