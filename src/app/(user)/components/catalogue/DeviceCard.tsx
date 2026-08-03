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
          shadow-[0_2px_4px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.25)]
          transition-all duration-200
        `,
        background.className,
        // Tags and the button below read `currentColor`/hardcoded light-bg
        // shades, so a dark card needs its text flipped here rather than in
        // each descendant.
        background.dark && "text-white",
        className
      )}
    >
      {/* Fills the card's full height on sm+ (a row layout) via the default
          `align-items: stretch` on the root flex row below — no explicit
          height utility needed there; a flex item's stretched cross-size is
          a real, definite height, unlike `h-full` (height: 100%), which
          can't resolve against this row's own auto/content-driven height and
          collapses to 0 (the bug: an uploaded thumbnail rendering as
          nothing). On mobile (`max-sm:flex-col`) stretch only affects width,
          not height, so `max-sm:h-48` gives it an explicit height there.
          `object-contain` never crops; `object-bottom` anchors a
          smaller-than-the-box image to the bottom edge (every device photo
          "stands" on the same ground line) instead of floating centered in
          the leftover space. */}
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
      {/* `min-w-0` lets this column shrink below its longest word — without it
          the flex item refuses to go under its min-content width and the text
          overflows the card instead of wrapping. `hyphens-auto` (relies on the
          root `lang="en"`) breaks long words with a hyphen; `wrap-break-word`
          catches the ones no dictionary knows, like model codes. */}
      <div className="flex flex-col flex-1 min-w-0 hyphens-auto wrap-break-word p-5">
        <h3 className="h3-format font-semibold text-balance max-sm:text-center">{item.name}</h3>
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
            "p-card-format text-left! max-sm:text-center mt-2 line-clamp-4 sm:min-h-20 lg:min-h-24 2xl:min-h-28",
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
          className={cn(
            'bg-transparent text-base! max-sm:w-full',
            background.dark
              ? 'sm:border-neutral-300 sm:text-neutral-300 group-hover:border-white group-hover:text-white hover:bg-white hover:text-black'
              : 'sm:border-neutral-500 sm:text-neutral-500 group-hover:border-black group-hover:text-black hover:bg-black hover:text-white'
          )}
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
