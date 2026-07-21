"use client"

import Image from "next/image"
import { useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getGalleryImages } from "@/app/(user)/media/galleries/actions"
import Lightbox, {
  hasSlides,
  useLightboxState,
  type ContainerRect,
  type Slide,
} from "yet-another-react-lightbox"
import Counter from "yet-another-react-lightbox/plugins/counter"
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen"
import Zoom from "yet-another-react-lightbox/plugins/zoom"
import "yet-another-react-lightbox/styles.css"
import "yet-another-react-lightbox/plugins/counter.css"

interface IGalleryImage {
  src: string
  alt: string
  // Intrinsic pixel dimensions. Optional today (dummy assets); when the CMS
  // supplies them, the lightbox can compute zoom limits without waiting for load.
  width?: number
  height?: number
}

interface IGalleryViewer {
  galleryId: string
  // First few image paths only — the rest of a gallery (up to 50 images) is
  // fetched on demand via `getGalleryImages`, not shipped on initial page load.
  initialImages: string[]
  totalImages: number
  title?: string
}

const THUMBNAIL_SLOTS = 5

// Height reserved at the bottom of the lightbox for the custom thumbnail strip.
// Applied as `styles.container` bottom padding so the library shrinks the slide
// viewport to fit — the strip then sits in reserved space instead of overlapping
// the image (which a purely absolute overlay would do).
const THUMB_STRIP_HEIGHT = 96

type INextSlide = Slide & { src: string; alt?: string; width?: number; height?: number }

// Renders a lightbox slide with next/image. When intrinsic dimensions are known the
// container is sized to the image's aspect ratio (fitted within the available rect),
// matching the official yet-another-react-lightbox Next.js integration. Reporting the
// natural size on load feeds the Zoom plugin, which reads dimensions from the slide
// rather than measuring custom-rendered children.
const LightboxSlide = ({
  slide,
  rect,
  onNaturalSize,
}: {
  slide: INextSlide
  rect: ContainerRect
  onNaturalSize: (src: string, width: number, height: number) => void
}) => {
  const hasDimensions = Boolean(slide.width && slide.height)
  const width = hasDimensions
    ? Math.round(Math.min(rect.width, (rect.height / slide.height!) * slide.width!))
    : rect.width
  const height = hasDimensions
    ? Math.round(Math.min(rect.height, (rect.width / slide.width!) * slide.height!))
    : rect.height

  return (
    <div style={{ position: "relative", width, height }}>
      <Image
        src={slide.src}
        alt={slide.alt ?? ""}
        fill
        draggable={false}
        className="object-contain"
        sizes="100vw"
        quality={90}
        onLoad={(event) =>
          onNaturalSize(slide.src, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)
        }
      />
    </div>
  )
}

// Full-width scrollable thumbnail strip pinned to the bottom of the lightbox. Unlike the
// built-in Thumbnails plugin (a fixed ~5-item sliding window with no scroll affordance),
// this renders every slide in a scrollable track with explicit paging buttons. The
// strip never auto-scrolls on its own — only the paging buttons move it — so selecting
// a thumbnail doesn't yank the track around.
const LightboxThumbnails = ({ onNavigate }: { onNavigate: (index: number) => void }) => {
  const { slides, currentIndex } = useLightboxState()
  const trackRef = useRef<HTMLDivElement>(null)

  if (!hasSlides(slides)) return null

  // Route the jump back through the parent's controlled `index` prop (the same value
  // Lightbox is opened with) instead of publishing ACTION_NEXT/PREV with a `count` —
  // that animates a swipe across every slide in between, which for a distant thumbnail
  // reads as the whole viewer sliding across the screen.
  const goToSlide = (index: number) => {
    if (index !== currentIndex) onNavigate(index)
  }

  const scrollByPage = (direction: 1 | -1) => {
    trackRef.current?.scrollBy({
      left: direction * trackRef.current.clientWidth * 0.75,
      behavior: "smooth",
    })
  }

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-1 flex items-center gap-1 px-2 sm:gap-2 sm:px-4"
      style={{ height: THUMB_STRIP_HEIGHT }}
    >
      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        aria-label="Scroll thumbnails left"
        className="shrink-0 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ChevronLeft className="size-5" />
      </button>

      <div
        ref={trackRef}
        className="flex h-full flex-1 items-center gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goToSlide(index)}
            aria-label={`Go to image ${index + 1}`}
            aria-current={index === currentIndex}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red2 ${
              index === currentIndex ? "" : "opacity-50 hover:opacity-90"
            }`}
          >
            <Image
              src={(slide as INextSlide).src}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
            />
            {index === currentIndex && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-inset ring-brand-red2"
              />
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByPage(1)}
        aria-label="Scroll thumbnails right"
        className="shrink-0 rounded-full bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}

export const GalleryViewer = ({
  galleryId,
  initialImages,
  totalImages,
  title,
}: IGalleryViewer) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [naturalSizes, setNaturalSizes] = useState<
    Record<string, { width: number; height: number }>
  >({})
  const [loadedSrcs, setLoadedSrcs] = useState<string[] | null>(null)
  const loadStartedRef = useRef(false)

  const srcs = loadedSrcs ?? initialImages
  const hasMore = totalImages > srcs.length

  // Fetches the rest of the gallery's images on first need (opening the
  // lightbox, or navigating past what's already loaded) instead of shipping
  // all of a gallery's (up to 50) images on initial page load.
  const ensureAllImagesLoaded = () => {
    if (!hasMore || loadStartedRef.current) return
    loadStartedRef.current = true
    getGalleryImages(galleryId)
      .then((fetched) => setLoadedSrcs(fetched))
      .catch(() => {
        loadStartedRef.current = false
      })
  }

  const images = useMemo<IGalleryImage[]>(
    () =>
      srcs.map((src, index) => ({
        src,
        alt: title ? `${title} photo ${index + 1}` : `Gallery photo ${index + 1}`,
      })),
    [srcs, title],
  )

  const slides = useMemo<INextSlide[]>(
    () =>
      images.map((image) => ({
        src: image.src,
        alt: image.alt,
        title: image.alt,
        width: image.width ?? naturalSizes[image.src]?.width,
        height: image.height ?? naturalSizes[image.src]?.height,
      })),
    [images, naturalSizes],
  )

  if (images.length === 0) return null

  const activeImage = images[activeIndex]
  const showPrev = () => {
    ensureAllImagesLoaded()
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
  }
  const showNext = () => {
    ensureAllImagesLoaded()
    setActiveIndex((prev) => (prev + 1) % images.length)
  }
  const openLightboxAt = (index: number) => {
    ensureAllImagesLoaded()
    setActiveIndex(index)
    setLightboxOpen(true)
  }
  const handleNaturalSize = (src: string, width: number, height: number) => {
    if (!width || !height) return
    setNaturalSizes((prev) => (prev[src] ? prev : { ...prev, [src]: { width, height } }))
  }

  // Last slot is reserved for the "See All" button, so only 4 thumbnails show
  const thumbnails = images.slice(0, THUMBNAIL_SLOTS - 1)

  return (
    <div className="flex w-full flex-col gap-3">

      {/* Main viewer — 16:9 container, images keep their natural ratio inside it */}
      <div className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-100">
        <button
          type="button"
          onClick={() => openLightboxAt(activeIndex)}
          aria-label={title ? `Open ${title} fullscreen` : "Open gallery fullscreen"}
          className="absolute inset-0 cursor-zoom-in focus:outline-none"
        >
          <Image
            src={activeImage.src}
            alt={activeImage.alt}
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
          />
        </button>

        <button
          type="button"
          onClick={showPrev}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronLeft className="size-6" />
        </button>
        <button
          type="button"
          onClick={showNext}
          aria-label="Next image"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronRight className="size-6" />
        </button>

        <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
          {activeIndex + 1} / {totalImages}
        </span>
      </div>

      {/* Thumbnail row: 4 images + "See All" */}
      <div className="grid grid-cols-5 gap-3">
        {thumbnails.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            onDoubleClick={() => openLightboxAt(index)}
            aria-label={`Show ${image.alt}`}
            className={`relative aspect-square w-full overflow-hidden rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red2 ${
              activeIndex === index ? "" : "opacity-80 hover:opacity-100"
            }`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              sizes="20vw"
            />
            {activeIndex === index && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-inset ring-brand-red2"
              />
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={() => openLightboxAt(THUMBNAIL_SLOTS - 1 < images.length ? THUMBNAIL_SLOTS - 1 : 0)}
          className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-900 text-white transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red2"
        >
          {images[THUMBNAIL_SLOTS - 1] && (
            <Image
              src={images[THUMBNAIL_SLOTS - 1].src}
              alt=""
              fill
              className="object-cover opacity-40"
              sizes="20vw"
            />
          )}
          <span className="relative text-sm font-semibold sm:text-base">
            See All
          </span>
        </button>
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={activeIndex}
        on={{ view: ({ index }) => setActiveIndex(index) }}
        slides={slides}
        plugins={[Zoom, Fullscreen, Counter]}
        controller={{ closeOnBackdropClick: true }}
        zoom={{ maxZoomPixelRatio: 2, doubleTapDelay: 300 }}
        styles={{ container: { paddingBottom: THUMB_STRIP_HEIGHT } }}
        render={{
          controls: () => <LightboxThumbnails onNavigate={setActiveIndex} />,
          slide: ({ slide, rect }) => (
            <LightboxSlide
              slide={slide as INextSlide}
              rect={rect}
              onNaturalSize={handleNaturalSize}
            />
          ),
          iconPrev: () => <ChevronLeft className="size-8" />,
          iconNext: () => <ChevronRight className="size-8" />,
        }}
      />
    </div>
  )
}
