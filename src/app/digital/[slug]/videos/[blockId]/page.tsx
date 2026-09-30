import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPublishedDigitalMediaBlock } from "@/lib/digital";
import { getYoutubeVideoId } from "@/lib/utils";
import { YoutubeEmbed } from "@/app/(user)/components/YoutubeEmbed";

// Standalone, same treatment as the rest of the `/digital` flow (ADR-109) —
// a "youtube" block's own real page (ADR-111), replacing the in-page dialog
// ADR-110 originally used.
interface IPageProps {
  params: Promise<{ slug: string; blockId: string }>;
}

export async function generateMetadata({ params }: IPageProps): Promise<Metadata> {
  const { slug, blockId } = await params;
  const result = await getPublishedDigitalMediaBlock(slug, blockId);
  if (!result || result.block.type !== "youtube") return { title: "Digital Content" };

  return { title: `${result.block.label} | PT. Radian Elok Distriversa` };
}

export default async function DigitalVideosPage({ params }: IPageProps) {
  const { slug, blockId } = await params;
  const result = await getPublishedDigitalMediaBlock(slug, blockId);
  if (!result || result.block.type !== "youtube") notFound();

  const { block } = result;

  return (
    <main className="min-h-svh bg-black px-6 py-10 text-white md:px-16 md:py-14">
      <Link href={`/digital/${slug}`} className="inline-flex items-center gap-2 text-white/70 transition-colors hover:text-white">
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <h1 className="h1-format mt-6 text-balance">{block.label}</h1>

      <div className="mt-10 flex max-w-3xl flex-col gap-12">
        {block.videos.map((video) => {
          const videoId = getYoutubeVideoId(video.url);
          if (!videoId) return null;

          return (
            <div key={video.id} className="flex flex-col gap-3">
              <div className="aspect-video overflow-hidden rounded-xl">
                <YoutubeEmbed id={videoId} title={video.title || block.label} />
              </div>
              {video.title && <h2 className="h3-format">{video.title}</h2>}
              {video.description && <p className="p-format text-left! text-white/80">{video.description}</p>}
            </div>
          );
        })}
      </div>
    </main>
  );
}
