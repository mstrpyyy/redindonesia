import Image from 'next/image'
import { HeroDevice } from './Hero'
import { SectionNavDevice } from './SectionNav'
import { HighlightDevice } from './Highlight'
import { GridListDevice } from './GridFeature'
import { BeforeAfterDevice } from './BeforeAfter'
import { DocumentDevice } from './Document'
import { DropdownDevice } from './Dropdown'
import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { BasicCarousel } from '@/app/(user)/components/Carousels'
import { VideoTextSection } from '@/app/(user)/components/VideoTextSection'
import Viewer360 from '@/app/(user)/components/Viewer360'
import { Button } from '@/components/ui/button'
import { cn, getYoutubeVideoId } from '@/lib/utils'
import { IProduct } from '@/interfaces/general'
import { ICertification, IHeroDoc, IHeroSegment, IProductSegment } from '@/interfaces/segments'
import { getHeroTextColor } from '@/lib/hero-text-colors'
import { getCertificationHref, getCertificationLogo, getCertificationSubLabel } from '@/lib/certification-logos'

interface IProductPageViewProps {
  product: IProduct
}

// `contrastClassName` is the same black/white the rest of the hero's
// secondary text uses (ADR-048) — the badge's own text follows it, and its
// logo swaps to the matching white/black asset via `CERTIFICATION_LOGOS`
// (ADR-049) instead of trying to recolor a raster image with CSS.
function CertificationBadge({
  certification,
  contrastClassName,
}: {
  certification: ICertification
  contrastClassName: string
}) {
  const isBlack = contrastClassName === 'text-black'
  const logo = getCertificationLogo(certification, isBlack ? 'black' : 'white')
  const subLabel = getCertificationSubLabel(certification)
  // LKPP has no uploaded certificate — a link stands in for it (ADR-053).
  const href = getCertificationHref(certification)

  const content = (
    <>
      {logo && (
        <Image src={logo} alt={certification.label} height={1080} width={1080} className='h-6 w-auto' />
      )}
      <p className='text-left'>
        <span className='block font-medium text-xxs'>{certification.label}</span>
        {subLabel && <span className='block font-normal text-xxs'>{subLabel}</span>}
      </p>
    </>
  )

  if (!href) {
    return (
      <div className={cn('h-11 gap-2 rounded-full px-4 flex items-center bg-transparent backdrop-blur-sm', contrastClassName)}>
        {content}
      </div>
    )
  }

  return (
    <Button variant='transparent' className='h-11 gap-2 rounded-full px-4' asChild>
      {/* `transparent`'s own `text-white` (button.tsx, not to be edited)
          lands on this `<a>` itself via Radix Slot's prop merge — same
          same-element tie as the document button (Hero.tsx). Wrapping the
          content one level deeper overrides through normal
          nearest-ancestor inheritance instead. */}
      <a href={href} target='_blank' rel='noopener noreferrer'>
        <span className={cn('inline-flex items-center gap-2', contrastClassName)}>{content}</span>
      </a>
    </Button>
  )
}

// Every non-hero segment type mapped onto the real public catalogue
// component that renders it — mirrors the exact prop shapes documented in
// segment-types.ts (ADR-020). `viewer360` and `techSpecs` are independent
// segments (no longer paired side-by-side the way the old hardcoded page did
// it), each getting its own full-width section. `document` resolves its
// referenced entry out of `heroDocs`/`heroCertifications` (ADR-051, ADR-059)
// — the only case that needs more than its own segment data.
function renderSegment(segment: IProductSegment, heroDocs: IHeroDoc[], heroCertifications: ICertification[]) {
  switch (segment.type) {
    case 'highlight':
      return (
        <HighlightDevice
          header={segment.header}
          text={segment.text}
          image={segment.image}
          textSide={segment.imagePlacement === 'left' ? 'right' : 'left'}
          imageFit={segment.imageFit}
        />
      )

    case 'treatments':
      return (
        <GridListDevice
          header={segment.header}
          list={segment.items}
          columns={segment.columns}
          backgroundColor={segment.backgroundColor}
        />
      )

    case 'viewer360':
      return (
        <BodyWrapper className='my-14'>
          <div className={cn('flex flex-col gap-6 items-center', segment.header && 'lg:flex-row lg:justify-center')}>
            {segment.header && (
              <h2 className='h2-md-format max-lg:text-center xl:text-3xl! shrink-0 lg:w-fit lg:max-w-100'>{segment.header}</h2>
            )}
            <div className='w-full max-w-125'>
              <Viewer360
                imgUrlTemplate={segment.imgUrlTemplate}
                totalFrames={segment.totalFrames}
                extension={segment.extension}
                width={segment.width}
                height={segment.height}
              />
            </div>
          </div>
        </BodyWrapper>
      )

    case 'techSpecs':
      return (
        <BodyWrapper className='my-14'>
          <DropdownDevice
            header={segment.header}
            backgroundColor={segment.backgroundColor}
            list={segment.items.map((item) => ({
              title: item.title,
              body: item.body,
              // DropdownDevice expects a ReactNode icon; the segment stores
              // an uploaded image URL, so it's wrapped here rather than
              // changing DropdownDevice's own props (deferred retrofit).
              // `icon` is required in segment-types.ts, but that's only
              // enforced for the admin UI's completeness indicator —
              // `validateSegments` never checks list-item fields — so a
              // saved item can still have an empty string here.
              icon: item.icon ? <Image src={item.icon} alt={item.title} width={30} height={30} /> : undefined,
            }))}
          />
        </BodyWrapper>
      )

    case 'applicators': {
      // `imageUrl` isn't required on this segment's item field (unlike most
      // other image fields), but BasicCarousel always renders one — an item
      // saved without one is dropped rather than passed through as an empty
      // `src`, which would trigger a full-page-refetch warning.
      const items = segment.items.filter(
        (item): item is typeof item & { imageUrl: string } => Boolean(item.imageUrl)
      )
      if (items.length === 0) return null

      return (
        <BodyWrapper className='my-14'>
          <h2 className='h2-format text-center! mb-8'>{segment.header}</h2>
          <BasicCarousel list={items} />
        </BodyWrapper>
      )
    }

    case 'beforeAfter':
      return (
        <BeforeAfterDevice
          h2={segment.header}
          imageList={segment.items.map((item) => ({
            title: item.title,
            before: { title: 'Before', imageUrl: item.beforeImageUrl, alt: item.beforeAlt },
            after: { title: 'After', imageUrl: item.afterImageUrl, alt: item.afterAlt },
          }))}
        />
      )

    case 'document': {
      // Can highlight either a Downloadable Document or a Certification
      // (ADR-059, layout unified by ADR-061) — same "drop rather than
      // render broken" precedent as `applicators` above when the
      // referenced entry can't be resolved. A document with no thumbnail
      // is NOT treated as broken (see ADR-057) — `DocumentDevice` falls
      // back to a plain outline button instead.
      if (segment.referenceKind === 'certification') {
        const certification = heroCertifications.find((item) => item.id === segment.referenceId)
        if (!certification) return null

        return (
          <BodyWrapper className='my-14'>
            <DocumentDevice
              header={segment.header}
              subheader={segment.subheader}
              fileUrl={getCertificationHref(certification)}
              alt={certification.label}
              certification={{
                logo: getCertificationLogo(certification, 'original'),
                name: certification.label,
                number: getCertificationSubLabel(certification),
              }}
            />
          </BodyWrapper>
        )
      }

      const doc = heroDocs.find((item) => item.id === segment.referenceId)
      if (!doc) return null

      return (
        <BodyWrapper className='my-14'>
          <DocumentDevice
            header={segment.header}
            subheader={segment.subheader}
            fileUrl={doc.href}
            thumbnailUrl={doc.thumbnailUrl}
            alt={segment.alt}
          />
        </BodyWrapper>
      )
    }

    case 'richText':
      return (
        <BodyWrapper className='my-14'>
          <div
            className='tiptap-content tiptap-content-product'
            dangerouslySetInnerHTML={{ __html: segment.body }}
          />
        </BodyWrapper>
      )

    case 'video': {
      const videoId = getYoutubeVideoId(segment.url)
      if (!videoId) return null

      return (
        <BodyWrapper className='my-14'>
          <VideoTextSection
            videoId={videoId}
            videoTitle={segment.caption || 'YouTube video'}
            thumbnailUrl={segment.thumbnailUrl || undefined}
            heading={segment.caption || undefined}
            description={segment.description || undefined}
          />
        </BodyWrapper>
      )
    }

    default:
      return null
  }
}

export const ProductPageView = ({ product }: IProductPageViewProps) => {
  const hero = product.segments.find((segment): segment is IHeroSegment => segment.type === 'hero')
  const contentSegments = product.segments.filter((segment) => segment.type !== 'hero')

  // Segment ids are `crypto.randomUUID()`, which often starts with a digit —
  // AosProvider's global hash-click handler runs `document.querySelector`
  // on the href, which throws on a digit-leading id. Prefixing keeps every
  // anchor a legal CSS identifier.
  const navItems = contentSegments
    .filter((segment) => segment.showInNav && segment.name)
    .map((segment) => ({ name: segment.name as string, href: `#segment-${segment.id}` }))

  const heroColor = hero ? getHeroTextColor(hero.textColor) : undefined

  return (
    <main>
      {hero && heroColor && (
        <HeroDevice
          variant='product'
          title={hero.title}
          description={hero.description}
          imgAlt={hero.imgAlt}
          imgUrl={hero.imgUrl}
          heroDocs={hero.heroDocs}
          textColorClassName={heroColor.className}
          contrastClassName={heroColor.contrastClassName}
        >
          {hero.certifications.length > 0 && (
            <div className='z-30 flex max-sm:flex-col items-start sm:items-center gap-2'>
              <div>
                <h3 className={cn(heroColor.contrastClassName, 'text-xs')}>Device Certifications:</h3>
                <p className={cn(heroColor.contrastClassName, 'text-xxs')}>Click to view</p>
              </div>
              <div className='flex flex-wrap gap-2 items-center'>
                {hero.certifications.map((certification, index) => (
                  <CertificationBadge
                    key={index}
                    certification={certification}
                    contrastClassName={heroColor.contrastClassName}
                  />
                ))}
              </div>
            </div>
          )}
        </HeroDevice>
      )}

      {navItems.length > 0 && <SectionNavDevice list={navItems} />}

      {contentSegments.map((segment) => (
        <div key={segment.id} id={`segment-${segment.id}`}>
          {renderSegment(segment, hero?.heroDocs ?? [], hero?.certifications ?? [])}
        </div>
      ))}
    </main>
  )
}
