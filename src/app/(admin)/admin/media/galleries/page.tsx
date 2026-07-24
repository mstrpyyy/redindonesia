import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getGalleries } from '@/lib/galleries'
import { GalleryTable } from './gallery-table'

export default async function GalleriesPage() {
  const galleries = await getGalleries()

  return (
    <>
      <AdminTitle parent={'Media'} title={'Galleries'} />
      <GalleryTable galleries={galleries} />
    </>
  )
}
