import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IDeviceCardItem } from '@/interfaces/general'

interface ICategoryCardProps extends React.ComponentProps<'div'> {
  item: IDeviceCardItem
}

// A different visual language from DeviceCard (product/device cards) — a
// full-bleed background photo (the sub-category's own largest hero banner,
// `bannerXlUrl`) with a dark overlay and the title/description/CTA centered
// on top, instead of DeviceCard's side-by-side image+text layout. Only used
// for the "Browse Categories" sub-category grid (CategoryPageView.tsx) —
// products/devices still render through DeviceCard.
export const CategoryCard = ({ item, className, ...props }: ICategoryCardProps) => {
  return (
    <div
      {...props}
      className={cn(
        `
          group relative flex min-h-80 flex-col items-center overflow-hidden
          rounded-2xl bg-neutral-800 px-6 py-10 text-center
          shadow-[0_2px_4px_rgba(0,0,0,0.25)] transition-all duration-200
          hover:shadow-[0_4px_10px_rgba(0,0,0,0.25)]
        `,
        className
      )}
    >
      {item.imgUrl && (
        <Image
          src={item.imgUrl}
          alt={item.name}
          fill
          className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      )}
      {/* Darkens the background photo so the white title/description/CTA
          stay legible regardless of how bright the photo itself is. */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex h-full flex-col items-center justify-between gap-3 text-white">
        <div className="flex flex-col items-center gap-3">
          <h3 className="h3-format font-semibold text-balance">{item.name}</h3>
          {item.desc && <p className="p-card-format max-w-md text-center! text-balance">{item.desc}</p>}
        </div>
        <Button asChild variant="glass" size="lg" className="rounded-full">
          <Link href={item.url}>
            View Category
            <ArrowRight className="size-5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
