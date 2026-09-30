import Link from "next/link";
import Image from "next/image";
import { BookOpen, FileDown, PlayCircle } from "lucide-react";
import type { IDigitalMediaBlock } from "@/interfaces/digital";

// Same generic-icon-fallback idiom as the catalogue Hero's document buttons
// (`FileDown`) — this codebase has no custom per-media-type icon asset, so a
// block without its own uploaded `imageUrl` gets a sensible lucide-react
// stand-in per type instead.
function DefaultBlockIcon({ type }: { type: IDigitalMediaBlock["type"] }) {
  if (type === "youtube") return <PlayCircle className="size-6" />;
  if (type === "flipbook") return <BookOpen className="size-6" />;
  return <FileDown className="size-6" />;
}

const buttonClassName =
  "group flex items-center gap-3 text-left text-white transition-colors hover:text-brand-peach";
const labelClassName = "font-semibold tracking-wide uppercase";

// The uploaded button image "replaces the label" (per its own admin helper
// text, media-block-label-fields.tsx) — shown alone, larger, rather than
// alongside the text. Without one, the fallback icon still pairs with the
// visible label so the button isn't just a bare icon.
function BlockContent({ block }: { block: IDigitalMediaBlock }) {
  if (block.imageUrl) {
    return (
      <span className="relative size-36 shrink-0 overflow-hidden sm:size-40 md:size-44">
        <Image src={block.imageUrl} alt={block.label} fill className="object-contain" sizes="176px" />
      </span>
    );
  }

  return (
    <>
      <span className="shrink-0">
        <DefaultBlockIcon type={block.type} />
      </span>
      <span className={labelClassName}>{block.label}</span>
    </>
  );
}

// One button per media block, every one a real navigation (no in-page
// modal): "flipbook"/"document" open their one file directly (default
// browser behavior, per spec); "youtube" and "flipbook" blocks that need
// more than a raw file link to their own page under this item
// (`/digital/[slug]/videos/[blockId]`, `/digital/[slug]/flipbook/[blockId]`
// — see ADR-111).
export function MediaBlockButton({ block, itemSlug }: { block: IDigitalMediaBlock; itemSlug: string }) {
  if (block.type === "youtube") {
    return (
      <Link href={`/digital/${itemSlug}/videos/${block.id}`} className={buttonClassName}>
        <BlockContent block={block} />
      </Link>
    );
  }

  if (block.type === "flipbook") {
    return (
      <Link href={`/digital/${itemSlug}/flipbook/${block.id}`} className={buttonClassName}>
        <BlockContent block={block} />
      </Link>
    );
  }

  return (
    <a href={block.fileUrl} target="_blank" rel="noopener noreferrer" className={buttonClassName}>
      <BlockContent block={block} />
    </a>
  );
}
