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

  return (
    <div
      {...props}
      className={cn(
        `
          group
          flex max-sm:items-center max-sm:flex-col rounded-2xl
          shadow-[0_2px_4px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.25)]
          transition-all duration-200
        `,
        getCardBackground(item.background).className,
        className
      )}
    >
      {/* `items-end`: the image column stretches to the card's height, so an
          image shorter than the text sits flush to the bottom edge rather
          than floating at the top with a gap underneath it. */}
      <div className="w-2/3 max-sm:max-w-[200px] sm:w-3/7 flex items-end">
        {item.imgUrl ? (
          <Image
            src={item.imgUrl}
            alt={item.name}
            width={600}
            height={600}
            className="w-full h-auto object-contain"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-neutral-400">
            <ImageOff className="size-8" />
          </div>
        )}
      </div>
      {/* `min-w-0` lets this column shrink below its longest word — without it
          the flex item refuses to go under its min-content width and the text
          overflows the card instead of wrapping. `hyphens-auto` (relies on the
          root `lang="en"`) breaks long words with a hyphen; `wrap-break-word`
          catches the ones no dictionary knows, like model codes. */}
      <div className="flex flex-col flex-1 min-w-0 hyphens-auto wrap-break-word p-5">
        <h3 className="h3-format font-semibold">{item.name}</h3>
        {/* The description is clamped to 4 lines, so a one-line tagline used
            to make its card ~3 lines shorter than a long one and every card
            ended up a different shape. Reserving the full 4 lines whatever
            the content means every card renders at that tallest layout, so
            they all share one ratio. The min-heights are 4x the line-height
            `p-card-format` sets at each breakpoint (20/24/28px) — kept
            smaller than the site's other body copy so there's room for the
            tag list below without growing the card. */}
        <p
          className={cn(
            "p-card-format text-left! mt-2 line-clamp-4 min-h-20 lg:min-h-24 2xl:min-h-28",
            hasTags ? "mb-2" : "mb-6"
          )}
        >
          {item.desc}
        </p>

        {/* Omitted for a category card (`item.tags` is `undefined`, not `[]`)
            — only a product/device card has tags of its own (ADR-041). */}
        {hasTags && (
          <div className="mb-4 flex flex-wrap gap-1.5">
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
          className={`
            sm:border-neutral-500 sm:text-neutral-500 group-hover:border-black group-hover:text-black
            bg-transparent hover:bg-black hover:text-white
            text-base!
          `}
        >
          <Link href={item.url} className="mt-auto w-fit ml-auto">
            View Product
            <ArrowRight className="size-5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
