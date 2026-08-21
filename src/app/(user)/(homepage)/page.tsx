import { BodyWrapper } from "@/app/(user)/components/BodyWrapper";
import { HeroHomeSection } from "./(sections)/Hero";
import { StatCounter } from "./(sections)/StatCounter";
import { ChooseUsHomeSection } from "./(sections)/ChooseUs";
import { CredibilityHomeSection } from "./(sections)/Credibility";
import { Metadata } from "next";
import { AboutHomeSection } from "./(sections)/About";
import { VideoHomeSection } from "./(sections)/Video";
import { BrandHomeSection } from "./(sections)/Brand";
import { ProductHomeSection } from "./(sections)/Products";
import { getPublicHomeCarousels } from "@/lib/home-carousels";
import { getHomePage } from "@/lib/home-page";

const description =
  "Established in 2004, PT. Radian Elok Distriversa has many years of experience and a broad network in the field of trading and distribution for medical aesthetic devices, medical laser devices, and cosmoceutical products.";

export const metadata: Metadata = {
  title: 'Home',
  description,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PT. Radian Elok Distriversa',
    description,
    url: '/',
    // Static fallback — matches the hero's own fallback image (Hero.tsx) so
    // the OG preview isn't left without an image on a request where the CMS
    // hero banner hasn't been fetched (metadata here is a static export, not
    // `generateMetadata`, so it can't await the CMS banner itself).
    images: ['/image/home/hero/herobanner-xl.webp'],
  },
};

export default async function Home() {
  const [carousels, homePage] = await Promise.all([
    getPublicHomeCarousels(),
    getHomePage("home"),
  ]);

  return (
    <main className="">
      {/* HERO */}
      <HeroHomeSection
        bannerSmUrl={homePage.bannerSmUrl}
        bannerSmVideoUrl={homePage.bannerSmVideoUrl}
        bannerMdUrl={homePage.bannerMdUrl}
        bannerMdVideoUrl={homePage.bannerMdVideoUrl}
        bannerLgUrl={homePage.bannerLgUrl}
        bannerLgVideoUrl={homePage.bannerLgVideoUrl}
        bannerXlUrl={homePage.bannerXlUrl}
        bannerXlVideoUrl={homePage.bannerXlVideoUrl}
        bannerVideoUseForSmaller={homePage.bannerVideoUseForSmaller}
      />

      <div className="shadow-[0_5px_25px_rgba(0,0,0,0.20)]">
        {/* ABOUT */}
        <BodyWrapper className="py-24 bg-secondary">
          <AboutHomeSection />
        </BodyWrapper>

        {/* STATS */}
        <StatCounter />

        {/* VIDEO */}
        <BodyWrapper className="py-14 lg:py-24 bg-brand-pink/50 backdrop-blur-md">
          <VideoHomeSection />
        </BodyWrapper>
      </div>

      {/* CHOOSE US */}
      <BodyWrapper className="">
        <ChooseUsHomeSection />
      </BodyWrapper>

      <div className="shadow-[0px_10px_25px_10px_rgba(0,0,0,0.20)]">
        {/* BRAND */}
        <BrandHomeSection />

        {/* CREDIBILITY */}
        <BodyWrapper className="py-10 sm:py-24 bg-brand-pink" id='certified-component'>
          <CredibilityHomeSection />
        </BodyWrapper>

        {/* PRODUCTS */}
        {carousels.length > 0 && (
          <BodyWrapper className="py-24 bg-secondary">
            <div className="space-y-20">
              {carousels.map((carousel) => (
                <ProductHomeSection
                  key={carousel.id}
                  title={carousel.title}
                  titleImg={carousel.titleImage ?? undefined}
                  href={carousel.seeMoreUrl ?? undefined}
                  size={carousel.size}
                  carouselList={carousel.items.map((item) => ({
                    img: item.img,
                    title: item.title,
                    href: item.href,
                  }))}
                />
              ))}
            </div>
          </BodyWrapper>
        )}
      </div>
    </main>
  );
}
