import { PageBanner } from '@/app/(user)/components/PageBanner'
import { BodyWrapper } from '../../components/BodyWrapper'
import { GalleryViewer } from '../../components/GalleryViewer'
import { getGalleries } from '@/lib/galleries'

// Only the first 6 image paths per gallery are sent to the client on initial
// render — GalleryViewer fetches the rest on demand (opening the lightbox or
// navigating past what's loaded) instead of shipping a gallery's full,
// potentially 50-image, set up front.
const INITIAL_IMAGE_COUNT = 6

export default async function MediaGalleries() {
  const galleries = await getGalleries()

  return (
    <main>
      <PageBanner
        defImage={'/image/media/galleries/dummy.jpg'}
        alt='RED (Radian Elok Distriversa) galleries'
      >
        <span className='text-brand-red2'>RED</span>
        {" "}
        <span className='text-white'>Galleries</span>
      </PageBanner>

      <div className='radial-gradient1 py-10'>
        {galleries.length === 0 && (
          <BodyWrapper className="py-10">
            <p className="p-format text-center text-pretty">
              No galleries have been published yet.
            </p>
          </BodyWrapper>
        )}

        {galleries.map((gallery, index) => (
          <BodyWrapper key={gallery.id} className="py-10">
            <div
              className={`flex lg:items-center gap-6 lg:gap-16 ${index % 2 === 1 ? "lg:flex-row-reverse flex-col" : "lg:flex-row flex-col"}`}
            >
              <div className="flex flex-col lg:w-200 2xl:w-250">
                <h2 className="h2-format max-lg:text-center">{gallery.title}</h2>
                {gallery.description && (
                  <p className="p-format text-pretty max-lg:text-center!">{gallery.description}</p>
                )}
              </div>
              <GalleryViewer
                galleryId={gallery.id}
                initialImages={gallery.images.slice(0, INITIAL_IMAGE_COUNT)}
                totalImages={gallery.images.length}
                title={gallery.title}
              />
            </div>
          </BodyWrapper>
        ))}
      </div>
    </main>
  )
}
