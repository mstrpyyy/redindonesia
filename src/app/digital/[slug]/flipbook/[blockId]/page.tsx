import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedDigitalMediaBlock } from "@/lib/digital";
import { FlipbookViewer } from "./flipbook-viewer";
import { FlipbookShareMenu } from "./flipbook-share-menu";

// Standalone, same treatment as the rest of the `/digital` flow (ADR-109) —
// a "flipbook" block's own real page (ADR-111), replacing the raw
// direct-to-PDF link.
interface IPageProps {
  params: Promise<{ slug: string; blockId: string }>;
}

export async function generateMetadata({ params }: IPageProps): Promise<Metadata> {
  const { slug, blockId } = await params;
  const result = await getPublishedDigitalMediaBlock(slug, blockId);
  if (!result || result.block.type !== "flipbook") return { title: "Digital Content" };

  return { title: `${result.block.label} | PT. Radian Elok Distriversa` };
}

export default async function DigitalFlipbookPage({ params }: IPageProps) {
  const { slug, blockId } = await params;
  const result = await getPublishedDigitalMediaBlock(slug, blockId);
  if (!result || result.block.type !== "flipbook") notFound();

  const { block } = result;

  return (
    <main className="flex min-h-svh flex-col bg-black text-white">
      <div className="flex items-center justify-between px-6 py-6 md:px-16">
        <Link href={`/digital/${slug}`} className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white">
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <FlipbookShareMenu />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <FlipbookViewer fileUrl={block.fileUrl} />
      </div>
    </main>
  );
}
