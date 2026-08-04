// Content-block shapes for `Product.segments` (see ADR-020). Each segment is
// one entry in an ordered array, rendered as a distinct section style on the
// public device/product detail page. `name` is the segment's own label,
// defaulting to its type's name; segments with `showInNav` appear under that
// name in the page's auto-generated section nav, linking to the segment's own
// DOM id.

export interface ISegmentBase {
  id: string
  name?: string
  showInNav?: boolean
}

export interface IHeroDoc {
  id: string
  title: string
  href: string
  thumbnailUrl?: string
}

// Certifications are a fixed set of "styles" rather than free-form entries —
// Halal/Kemenkes/BPOM are near-universal for these devices and each has its
// own required fields (Halal carries its certificate number, Kemenkes its
// AKL registration number, BPOM its own registration number; all three use a
// fixed shared logo; a custom "Other" certification has no logo, just a
// title). See ADR-022, and ADR-046 for BPOM specifically. LKPP (ADR-053) is
// the first style that's a link rather than an uploaded certificate — no
// logo, no file, just a URL. `id` (ADR-059) lets a Document Highlight
// segment reference a specific certification, the same way `IHeroDoc.id`
// lets it reference a document (ADR-051).
export interface IHalalCertification {
  id: string
  certType: 'halal'
  label: string
  imageUrl: string
  certificateNumber: string
  fileUrl: string
}

export interface IKemenkesCertification {
  id: string
  certType: 'kemenkes'
  label: string
  imageUrl: string
  aklNumber: string
  fileUrl: string
}

export interface IBpomCertification {
  id: string
  certType: 'bpom'
  label: string
  imageUrl: string
  registrationNumber: string
  fileUrl: string
}

export interface IOtherCertification {
  id: string
  certType: 'other'
  label: string
  fileUrl: string
}

export interface ILkppCertification {
  id: string
  certType: 'lkpp'
  label: string
  linkUrl: string
}

export type ICertification =
  | IHalalCertification
  | IKemenkesCertification
  | IBpomCertification
  | IOtherCertification
  | ILkppCertification

export interface IHeroSegment extends ISegmentBase {
  type: 'hero'
  title: string
  description: string
  imgUrl: string
  imgAlt: string
  heroDocs: IHeroDoc[]
  certifications: ICertification[]
  // One of HERO_TEXT_COLOR_VALUES (src/lib/hero-text-colors.ts) — see
  // ADR-045/ADR-047. Optional: a hero saved before this field existed falls
  // back to peach via `getHeroTextColor`.
  textColor?: string
}

export interface IHighlightSegment extends ISegmentBase {
  type: 'highlight'
  header: string
  text: string
  image: string
  // Which side the image sits on — the inverse of the public HighlightDevice
  // component's `textSide` prop, which still describes where the text goes.
  // Whoever wires this segment to that component needs to flip the value.
  imagePlacement: 'left' | 'right'
  // "fill" (default) crops the image to fill its box, same look as before
  // this field existed; "fit" letterboxes the whole image instead and drops
  // the box's rounded corners.
  imageFit: 'fill' | 'fit'
}

export interface ITreatmentItem {
  name: string
  svgUrl?: string
}

export interface ITreatmentsSegment extends ISegmentBase {
  type: 'treatments'
  header: string
  columns: '1' | '2'
  // One of SEGMENT_BACKGROUND_COLOR_VALUES (src/lib/segment-colors.ts).
  backgroundColor: string
  items: ITreatmentItem[]
}

export interface IViewer360Segment extends ISegmentBase {
  type: 'viewer360'
  header?: string
  imgUrlTemplate: string
  totalFrames: number
  extension: string
  width?: number
  height?: number
}

// Was a closed set of named Lucide icons picked from a dropdown; an admin
// uploaded icon (SVG or raster) for this version instead — see the
// techSpecs `icon` field in segment-types.ts (type: "icon").
export interface ITechSpecItem {
  icon: string
  title: string
  body: string
}

export interface ITechSpecsSegment extends ISegmentBase {
  type: 'techSpecs'
  header: string
  // One of SEGMENT_BACKGROUND_COLOR_VALUES (src/lib/segment-colors.ts).
  // Defaults to "peach", the color this segment always rendered with before
  // this field existed — see ADR-054.
  backgroundColor: string
  items: ITechSpecItem[]
}

export interface IApplicatorItem {
  title: string
  subTitle?: string
  imageUrl?: string
  text?: string
}

export interface IApplicatorsSegment extends ISegmentBase {
  type: 'applicators'
  header: string
  items: IApplicatorItem[]
}

export interface ICardGridItem {
  title: string
  subTitle?: string
  imageUrl?: string
  text?: string
}

export interface ICardGridSegment extends ISegmentBase {
  type: 'cardGrid'
  header: string
  // One of SEGMENT_BACKGROUND_COLOR_VALUES (src/lib/segment-colors.ts).
  backgroundColor: string
  items: ICardGridItem[]
}

export interface IBeforeAfterItem {
  title: string
  beforeImageUrl: string
  beforeAlt: string
  afterImageUrl: string
  afterAlt: string
}

export interface IBeforeAfterSegment extends ISegmentBase {
  type: 'beforeAfter'
  header: string
  items: IBeforeAfterItem[]
}

// References one entry from either the product's Downloadable Documents
// list or its Certifications list (both IHeroDoc[]/ICertification[], stored
// on the hero segment — ADR-026) by id, rather than carrying its own
// file/thumbnail — see ADR-051, extended to certifications by ADR-059.
// `referenceId` may point to an entry that's since been removed from its
// list; renders nothing until re-picked (ProductPageView.tsx). `header` is
// replaced with the picked entry's own name every time the reference
// changes (segments-builder.tsx) — freely editable afterward, until the
// next pick replaces it again. See ADR-056.
export interface IDocumentSegment extends ISegmentBase {
  type: 'document'
  header: string
  subheader?: string
  referenceKind: 'document' | 'certification'
  referenceId: string
  alt: string
}

export interface IRichTextSegment extends ISegmentBase {
  type: 'richText'
  body: string
}

// See ADR-052. Mirrors the Category page's own YouTube video fields
// (ICategory.youtube*), just as its own segment type rather than fields on
// the product record directly.
export interface IVideoSegment extends ISegmentBase {
  type: 'video'
  url: string
  thumbnailUrl?: string
  caption?: string
  description?: string
}

export type IProductSegment =
  | IHeroSegment
  | IHighlightSegment
  | ITreatmentsSegment
  | IViewer360Segment
  | ITechSpecsSegment
  | IApplicatorsSegment
  | ICardGridSegment
  | IBeforeAfterSegment
  | IDocumentSegment
  | IRichTextSegment
  | IVideoSegment
