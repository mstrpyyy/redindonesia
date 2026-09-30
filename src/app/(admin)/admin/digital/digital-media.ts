// Plain helpers shared between the client editor (digital-form.tsx,
// media-blocks-editor.tsx, and the youtube row editor) and the server
// action's own validation (digital-actions.ts) — kept in a plain module
// rather than inside digital-actions.ts because a "use server" file may only
// export async functions.

import { IDigitalMediaBlock, IDigitalYoutubeVideo } from "@/interfaces/digital";

// One "Add Media" menu entry per block type — a block can be added more than
// once (ADR-106), but only "youtube" holds multiple media within one block
// (ADR-107); "flipbook"/"document" each hold exactly one file.
export const DIGITAL_MEDIA_BLOCK_TYPES: { type: IDigitalMediaBlock["type"]; label: string }[] = [
  { type: "youtube", label: "YouTube Videos" },
  { type: "flipbook", label: "Flipbook PDF" },
  { type: "document", label: "Documents" },
];

export function getDigitalMediaBlockLabel(type: IDigitalMediaBlock["type"]): string {
  return DIGITAL_MEDIA_BLOCK_TYPES.find((option) => option.type === type)?.label ?? type;
}

// A "youtube" block always starts with one video row — the editor never lets
// it drop below one (see YoutubeVideosEditor), so a freshly added block
// shouldn't start empty either.
export function createEmptyDigitalMediaBlock(type: IDigitalMediaBlock["type"]): IDigitalMediaBlock {
  const id = crypto.randomUUID();
  if (type === "youtube") return { id, type, label: "", imageUrl: "", videos: [createEmptyDigitalYoutubeVideo()] };
  if (type === "flipbook") return { id, type, label: "", imageUrl: "", fileUrl: "" };
  return { id, type: "document", label: "", imageUrl: "", fileUrl: "" };
}

// A video's own `url` is the only thing required of it — `title`/
// `description` are shown on its video page but are optional (ADR-108); the
// video itself has no `label`, since it isn't a landing-page button.
export function createEmptyDigitalYoutubeVideo(): IDigitalYoutubeVideo {
  return { id: crypto.randomUUID(), url: "" };
}

export function isYoutubeVideoComplete(video: IDigitalYoutubeVideo): boolean {
  return video.url.trim() !== "";
}

// A block is complete once its landing-page button has a label (ADR-108) and
// its own content is filled in: a "youtube" block needs at least one
// complete video; "flipbook"/"document" need their one file.
export function isDigitalMediaBlockComplete(block: IDigitalMediaBlock): boolean {
  if (block.label.trim() === "") return false;
  if (block.type === "youtube") return block.videos.length > 0 && block.videos.every(isYoutubeVideoComplete);
  return block.fileUrl !== "";
}

// At least one block present, and every block complete.
export function isDigitalMediaComplete(blocks: IDigitalMediaBlock[]): boolean {
  return blocks.length > 0 && blocks.every(isDigitalMediaBlockComplete);
}
