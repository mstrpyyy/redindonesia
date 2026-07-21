"use client"

import Image from "next/image"
import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface IGalleryImageOld {
  src: string
  alt: string
}

interface IGalleryViewerOld {
  images: IGalleryImageOld[]
  title?: string
}

const THUMBNAIL_SLOTS = 5

// Superseded by the yet-another-react-lightbox based GalleryViewer — kept as a reference/rollback copy.
export const GalleryViewerOld = ({ images, title }: IGalleryViewerOld) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  if (images.length === 0) return null

  const activeImage = images[activeIndex]
  const showPrev = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length)
  const showNext = () => setActiveIndex((prev) => (prev + 1) % images.length)

  // Last slot is reserved for the "See All" button, so only 4 thumbnails show
  const thumbnails = images.slice(0, THUMBNAIL_SLOTS - 1)

  return (
    <div className="flex w-full flex-col gap-3">

      {/* Main viewer — 16:9 container, images keep their natural ratio inside it */}
      <div className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-neutral-100">
        <Image
          src={activeImage.src}
          alt={activeImage.alt}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority
        />

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
          {activeIndex + 1} / {images.length}
        </span>
      </div>

      {/* Thumbnail row: 4 images + "See All" */}
      <div className="grid grid-cols-5 gap-3">
        {thumbnails.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Show ${image.alt}`}
            className={`relative aspect-square w-full overflow-hidden rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red2 ${
              activeIndex === index
                ? "ring-2 ring-brand-red2 ring-offset-2"
                : "opacity-80 hover:opacity-100"
            }`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              sizes="20vw"
            />
          </button>
        ))}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-900 text-white transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red2"
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
          </DialogTrigger>

          <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col overflow-hidden p-4 sm:max-w-5xl sm:p-6">
            <DialogTitle className="shrink-0 pr-8">
              {title ?? "Gallery"}
            </DialogTitle>

            <div className="flex min-h-0 flex-col gap-4 md:flex-row">
              {/* Larger viewer on the left — 16:9 container, natural image ratio inside.
                  min-h-0 lets it shrink below its 16:9 height when the screen is short */}
              <div className="relative aspect-video min-h-0 w-full overflow-hidden rounded-xl bg-neutral-100 md:min-w-0 md:flex-1">
                <Image
                  src={activeImage.src}
                  alt={activeImage.alt}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
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
                  {activeIndex + 1} / {images.length}
                </span>
              </div>

              {/* Image list — horizontal strip below the viewer on mobile,
                  vertical scrollable column matching the viewer height from md up */}
              <div className="relative shrink-0 md:w-48">
                <div className="flex gap-3 overflow-x-auto pb-1 md:absolute md:inset-0 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:pb-0 md:pr-1">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Show ${image.alt}`}
                      className={`relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-red2 md:w-full ${
                        activeIndex === index ? "" : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 96px, 192px"
                      />
                      {activeIndex === index && (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-brand-red2"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
