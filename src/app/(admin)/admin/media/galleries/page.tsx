import { AdminTitle } from '@/app/(admin)/components/admin-title'
import { getGalleries } from '@/lib/galleries'
import { getGalleriesPage } from '@/lib/galleries-page'
import { GalleryTable } from './gallery-table'
import { GalleriesPageForm } from './galleries-page-form'

export default async function GalleriesPage() {
  const [galleries, page] = await Promise.all([
    getGalleries(),
    getGalleriesPage('galleries'),
  ])

  return (
    <>
      <AdminTitle parent={'Media'} title={'Galleries'} />
      <div className="flex flex-col gap-8 mt-6">
        <GalleriesPageForm slug="galleries" initialData={page} />
        <hr className="border-t" />
        <GalleryTable galleries={galleries} />
      </div>
    </>
  )
}
