import { Button } from "@/components/ui/button"
import { MoveRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { IHomeAboutLinkButton } from "@/interfaces/general"
import { HOMEPAGE_EMPTY_PLACEHOLDER } from "@/lib/home-page-constants"

// The stored heading HTML is always exactly one `<h2>…</h2>` (MiniRichTextEditor,
// "heading" mode) — unwrap it so the content can go straight into this
// section's own `<h2 className="h2-format">`.
function unwrapHeading(html: string): string {
  return html.replace(/^\s*<h2\b[^>]*>/i, '').replace(/<\/h2>\s*$/i, '')
}

// A link button carries only an image + a destination, so derive a short
// accessible name for the image from the href (the `#about-who` hash, or the
// last path segment).
function labelFromHref(href: string): string {
  const hash = href.split('#')[1]
  if (hash) return hash.replace(/[-_]/g, ' ').trim()
  const path = href.replace(/^https?:\/\/[^/]+/i, '').replace(/[/?#].*$/, '').replace(/\/+$/, '')
  const last = path.split('/').filter(Boolean).pop()
  return last ? last.replace(/[-_]/g, ' ') : 'Learn more'
}

export const AboutHomeSection = ({
  heading,
  body,
  linkButtons,
}: {
  heading: string | null
  body: string | null
  linkButtons: IHomeAboutLinkButton[]
}) => {
  return (
    <section className="flex max-lg:flex-col-reverse gap-15">
      {/* MENU */}
      <div className="gap-y-10 flex flex-col max-sm:items-center sm:flex-row sm:justify-evenly lg:flex-col">
        {linkButtons.length > 0 ? (
          linkButtons.map((button, index) => (
            <Link
              key={button.id}
              data-aos="fade-right"
              data-aos-easing="ease-out"
              data-aos-duration="500"
              data-aos-delay={(index * 150).toString()}
              href={button.href}
              className="relative group h-28 xs:h-32 lg:h-36 aspect-square"
            >
              <Image
                src={button.image}
                alt={labelFromHref(button.href)}
                fill
                sizes="300px"
                className="object-contain object-center group-hover:scale-105 transition-all duration-300"
              />
            </Link>
          ))
        ) : (
          <span className="text-neutral-400 text-4xl">{HOMEPAGE_EMPTY_PLACEHOLDER}</span>
        )}
      </div>

      {/* ABOUT */}
      <div
        className="flex-2 flex flex-col justify-between"
        data-aos="fade-zoom-in"
        data-aos-delay="100"
        data-aos-duration="1000"
      >
        {heading ? (
          <h2 className="h2-format" dangerouslySetInnerHTML={{ __html: unwrapHeading(heading) }} />
        ) : (
          <h2 className="h2-format">{HOMEPAGE_EMPTY_PLACEHOLDER}</h2>
        )}

        {body ? (
          <div
            className="p-format rich-body max-lg:mb-8 mt-6"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <p className="p-format max-lg:mb-8 mt-6">{HOMEPAGE_EMPTY_PLACEHOLDER}</p>
        )}

        <div className="max-lg:hidden flex-1 border-l-2 border-l-neutral-300 my-4" />

        <div className="max-lg:ml-auto flex items-center w-full">
          <div className="lg:hidden flex-1 border-t-2 border-t-neutral-300 mr-6" />
          <Button asChild variant="outlineSecondary">
            <Link href="/about">
              Our Story
              <MoveRight strokeWidth={1.5} size={30} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
