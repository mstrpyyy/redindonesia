"use client";

import Image from "next/image";
import Link from "next/link";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { IPublicDigitalItem } from "@/interfaces/digital";

// Same embla-backed Carousel every other public carousel uses
// (components/Carousels.tsx) — `variant="glass"` on the arrows instead of
// their outline default, since this page's background is black (see
// ADR-109). No card background behind the QR: these are transparent
// PNG/WEBP graphics meant to be read directly against the page's own black
// background (often white-on-transparent) — a white card behind one washes
// it out to near-invisible. The box is still the admin upload's 4:3-vertical
// shape, `object-contain`ed, so nothing gets stretched or cropped.
export function DigitalQrCarousel({ items }: { items: IPublicDigitalItem[] }) {
  return (
    <Carousel opts={{ align: "start", slidesToScroll: 1, loop: items.length > 3 }} className="w-full max-w-5xl">
      <CarouselContent className="-ml-6 py-2">
        {items.map((item) => (
          <CarouselItem key={item.id} className="basis-full pl-6 sm:basis-1/2 lg:basis-1/3">
            <Link href={`/digital/${item.slug}`} className="group flex flex-col items-center">
              <div className="relative aspect-[3/4] w-full max-w-56 overflow-hidden transition-transform group-hover:scale-105">
                <Image src={item.qrImageUrl} alt={item.name} fill className="object-contain" sizes="224px" />
              </div>
              {/* The item's `name` is entered for accessibility/SEO, not to be
                  read on the page (the QR carries no visible caption in the
                  reference design) — kept in the DOM for screen readers and
                  crawlers via `sr-only` rather than dropped. */}
              <span className="sr-only">{item.name}</span>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious variant="glass" className="border-none" />
      <CarouselNext variant="glass" className="border-none" />
    </Carousel>
  );
}
