import type { Metadata } from "next";
import { BodyWrapper } from "@/app/(user)/components/BodyWrapper";
import { PageBanner } from "@/app/(user)/components/PageBanner";
import { RevealText } from "@/app/(user)/components/RevealText";
import { VideoTextSection } from "@/app/(user)/components/VideoTextSection";
import { getAboutPage } from "@/lib/about-page";
import { getBrands } from "@/lib/brands";
import { getYoutubeVideoId } from "@/lib/utils";
import { AboutWho } from "./(sections)/Who";
import { AboutWhat } from "./(sections)/What";
import { AboutWork } from "./(sections)/Work";

export const metadata: Metadata = {
  title: "About",
  description:
    "Established in 2004, PT. Radian Elok Distriversa distributes medical aesthetic devices, medical laser devices, and cosmoceutical products across Indonesia, partnering with leading companies in Europe and the USA.",
};

export default async function About() {
  const [page, brands] = await Promise.all([getAboutPage("our-story"), getBrands()]);

  return (
    <main>
      <PageBanner
        defImage={page.bannerXlUrl ?? "/image/about/about-banner-xl.webp"}
        mdImage={page.bannerMdUrl ?? undefined}
        smImage={page.bannerSmUrl ?? undefined}
        defVideo={page.bannerXlVideoUrl}
        mdVideo={page.bannerMdVideoUrl}
        smVideo={page.bannerSmVideoUrl}
        videoUseForSmaller={page.bannerVideoUseForSmaller}
        alt="Our Story"
      >
        <RevealText
          words={[
            { text: "Our", className: "text-white" },
            { text: "Story", className: "text-brand-red2" },
          ]}
        />
      </PageBanner>
      <BodyWrapper className='radial-gradient1 py-20 shadow-md relative z-10'>
        <AboutWho iconUrl={page.whoIconUrl} body={page.whoBody} images={page.whoImages} />
        {page.videos.map((video) => {
          const videoId = getYoutubeVideoId(video.youtubeUrl);
          if (!videoId) return null;
          return (
            <VideoTextSection
              key={video.id}
              className='mt-16 sm:mt-20 lg:mt-30'
              videoId={videoId}
              videoTitle={video.heading || "Our Story video"}
              thumbnailUrl={video.thumbnailUrl || undefined}
              heading={video.heading || undefined}
              description={video.description || undefined}
            />
          );
        })}
      </BodyWrapper>
      <BodyWrapper className="py-20 bg-secondary">
        <AboutWhat iconUrl={page.whatIconUrl} body={page.whatBody} brands={brands} />
      </BodyWrapper>
      <BodyWrapper className="radial-gradient2 py-20 shadow-[0_-2px_6px_0px_rgba(0,0,0,0.12)] relative z-10">
        <AboutWork iconUrl={page.workIconUrl} body={page.workBody} cards={page.workCards} />
      </BodyWrapper>
    </main>
  )
}
