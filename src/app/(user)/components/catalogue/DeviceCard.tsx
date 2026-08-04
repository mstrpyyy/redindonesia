import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getCardBackground } from '@/lib/card-backgrounds'
import { IDeviceCardItem } from '@/interfaces/general'

interface IDeviceCardProps extends React.ComponentProps<'div'> {
  item: IDeviceCardItem
}

// Rendered both in the public catalogue grid (DeviceList) and as the live
// preview in the admin thumbnail editor — the preview is only honest if it's
// literally the same component, so keep this free of anything the admin can't
// mount. Rest props exist so DeviceList can attach its AOS attributes without
// this component knowing about them.
export const DeviceCard = ({ item, className, ...props }: IDeviceCardProps) => {
  const hasTags = Boolean(item.tags && item.tags.length > 0)
  const background = getCardBackground(item.background)

  return (
    <div
      {...props}
      className={cn(
        `
          group
          flex max-sm:items-center max-sm:flex-col rounded-2xl
          min-h-70
          shadow-[0_2px_4px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.25)]
          transition-all duration-200
          overflow-hidden
        `,
        background.className,
        // Tags and the button below read `currentColor`/hardcoded light-bg
        // shades, so a dark card needs its text flipped here rather than in
        // each descendant.
        background.dark && "text-white",
        className
      )}
    >
      <div className="relative w-2/3 max-sm:max-w-[200px] max-sm:h-48 sm:w-3/7 overflow-hidden">
        {item.imgUrl ? (
          <Image
            src={item.imgUrl}
            alt={item.name}
            fill
            className="object-contain object-bottom"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-400">
            <ImageOff className="size-8" />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 min-w-0 hyphens-auto wrap-break-word p-5">
        <h3 className="h3-card-format font-semibold text-balance max-sm:text-center">{item.name}</h3>
        <p
          className={cn(
            "p-card-format text-left! max-sm:text-center! mt-2 line-clamp-4",
            hasTags ? "mb-4" : "mb-6"
          )}
        >
          {item.desc}
        </p>

        {/* Omitted for a category card (`item.tags` is `undefined`, not `[]`)
            — only a product/device card has tags of its own (ADR-041). */}
        {hasTags && (
          <div className="mb-4 mt-auto max-sm:mx-auto flex flex-wrap gap-1.5">
            {item.tags!.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-current/30 px-2 py-0.5 text-xxs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <Button
          asChild
          variant={'outlineSecondary'}
          className={cn(
            'bg-transparent text-base! max-sm:w-full',
            hasTags? '' : 'mt-auto',
            background.dark
              ? 'sm:border-neutral-300 sm:text-neutral-300 group-hover:border-white group-hover:text-white hover:bg-white hover:text-black'
              : 'sm:border-neutral-500 sm:text-neutral-500 group-hover:border-black group-hover:text-black hover:bg-black hover:text-white'
          )}
        >
          <Link href={item.url} className="w-fit ml-auto">
            View Product
            <ArrowRight className="size-5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
