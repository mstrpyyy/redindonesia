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
  title: string
  href: string
}

// Certifications are a fixed set of "styles" rather than free-form entries —
// Halal/Kemenkes/BPOM are near-universal for these devices and each has its
// own required fields (Halal carries its certificate number, Kemenkes its
// AKL registration number, BPOM its own registration number; all three use a
// fixed shared logo; a custom "Other" certification has no logo, just a
// title). See ADR-022, and ADR-046 for BPOM specifically.
export interface IHalalCertification {
  certType: 'halal'
  label: string
  imageUrl: string
  certificateNumber: string
  fileUrl: string
}

export interface IKemenkesCertification {
  certType: 'kemenkes'
  label: string
  imageUrl: string
  aklNumber: string
  fileUrl: string
}

export interface IBpomCertification {
  certType: 'bpom'
  label: string
  imageUrl: string
  registrationNumber: string
  fileUrl: string
}

export interface IOtherCertification {
  certType: 'other'
  label: string
  fileUrl: string
}

export type ICertification =
  | IHalalCertification
  | IKemenkesCertification
  | IBpomCertification
  | IOtherCertification

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

export interface IDocumentSegment extends ISegmentBase {
  type: 'document'
  heading: string
  subheading?: string
  fileUrl: string
  thumbnailUrl: string
  alt: string
}

export interface IRichTextSegment extends ISegmentBase {
  type: 'richText'
  body: string
}

export type IProductSegment =
  | IHeroSegment
  | IHighlightSegment
  | ITreatmentsSegment
  | IViewer360Segment
  | ITechSpecsSegment
  | IApplicatorsSegment
  | IBeforeAfterSegment
  | IDocumentSegment
  | IRichTextSegment
