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
import { getBrands } from "@/lib/brands";

export const metadata: Metadata = {
  title: 'Home'
};

export default async function Home() {
  const [carousels, homePage, brands] = await Promise.all([
    getPublicHomeCarousels(),
    getHomePage("home"),
    getBrands(),
  ]);

  return (
    <main className="">
      {/* HERO */}
      <HeroHomeSection
        heading={homePage.heroHeading}
        subheading={homePage.heroSubheading}
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
          <AboutHomeSection
            heading={homePage.aboutHeading}
            body={homePage.aboutBody}
            linkButtons={homePage.aboutLinkButtons}
          />
        </BodyWrapper>

        {/* STATS */}
        <StatCounter stats={homePage.statistics} />

        {/* VIDEO */}
        <BodyWrapper className="py-14 lg:py-24 bg-brand-pink/50 backdrop-blur-md">
          <VideoHomeSection
            title={homePage.highlightVideoTitle}
            description={homePage.highlightVideoDescription}
            youtubeUrl={homePage.highlightVideoYoutubeUrl}
            thumbnailUrl={homePage.highlightVideoThumbnailUrl}
          />
        </BodyWrapper>
      </div>

      {/* CHOOSE US */}
      <BodyWrapper className="">
        <ChooseUsHomeSection
          title={homePage.featureListTitle}
          features={homePage.features}
        />
      </BodyWrapper>

      <div className="shadow-[0px_10px_25px_10px_rgba(0,0,0,0.20)]">
        {/* BRAND */}
        <BrandHomeSection title={homePage.brandsTitle} brands={brands} />

        {/* CREDIBILITY */}
        <BodyWrapper className="py-10 sm:py-24 bg-brand-pink" id='certified-component'>
          <CredibilityHomeSection
            title={homePage.certificationsTitle}
            certifications={homePage.certifications}
          />
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
