// Shapes for the `/digital` CMS (see ADR-108, refining ADR-107). Every block
// (youtube/flipbook/document) is one button on the landing page — that
// button's own `label` (required) and `imageUrl` (optional visual label)
// live on the block itself, in `IDigitalMediaBlockBase`. What the button
// leads to differs per type: "flipbook"/"document" open their one `fileUrl`
// directly; "youtube" opens a video page that can list one or more videos
// (`videos`), each with its own `url` (required), and an optional `title`/
// `description` shown on THAT page — a video never has its own label/image,
// since it isn't its own button on the landing page.

interface IDigitalMediaBlockBase {
  id: string;
  label: string;
  imageUrl?: string;
}

export interface IDigitalYoutubeVideo {
  id: string;
  url: string;
  title?: string;
  description?: string;
}

export interface IDigitalYoutubeBlock extends IDigitalMediaBlockBase {
  type: "youtube";
  videos: IDigitalYoutubeVideo[];
}

export interface IDigitalFlipbookBlock extends IDigitalMediaBlockBase {
  type: "flipbook";
  fileUrl: string;
}

export interface IDigitalDocumentBlock extends IDigitalMediaBlockBase {
  type: "document";
  fileUrl: string;
}

export type IDigitalMediaBlock = IDigitalYoutubeBlock | IDigitalFlipbookBlock | IDigitalDocumentBlock;

export interface IDigitalItem {
  id: string;
  name: string;
  slug: string;
  status: "hidden" | "public";
  order: number;
  qrImageUrl: string;
  bannerSmUrl: string | null;
  bannerSmVideoUrl: string | null;
  bannerMdUrl: string | null;
  bannerMdVideoUrl: string | null;
  bannerLgUrl: string | null;
  bannerLgVideoUrl: string | null;
  bannerXlUrl: string | null;
  bannerXlVideoUrl: string | null;
  bannerVideoUseForSmaller: boolean;
  media: IDigitalMediaBlock[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDigitalListItem {
  id: string;
  name: string;
  slug: string;
  status: "hidden" | "public";
  qrImageUrl: string;
  updatedAt: Date;
}

export interface IDigitalListFilters {
  search?: string;
  page?: number;
  pageSize?: number | "all";
}

export interface IDigitalListResult {
  items: IDigitalListItem[];
  total: number;
}

// The public `/digital` landing page's QR carousel — published items only,
// with just what that page renders (see ADR-109).
export interface IPublicDigitalItem {
  id: string;
  name: string;
  slug: string;
  qrImageUrl: string;
}
