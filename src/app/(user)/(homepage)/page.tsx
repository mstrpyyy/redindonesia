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
import { almaCarouselList, innoCarouselList } from "@/lib/data";

export const metadata: Metadata = {
  title: 'Home'
};

export default function Home() {
  return (
    <main className="">
      {/* HERO */}
      <HeroHomeSection />

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
        <BodyWrapper className="py-24 bg-secondary">
          <div className="space-y-20">
            <ProductHomeSection
              title="Alma Laser"
              titleImg="/image/home/alma-showcase/300ppi/logo-alma.webp"
              href="/devices/medical-aesthetics/alma-laser"
              size="md"
              carouselList={almaCarouselList}
            />
            <ProductHomeSection 
              title="INNO CE"
              titleImg="/image/home/inno-showcase/logo-inno-ce.webp"
              href="/devices/medical-aesthetics/inno-ce"
              size="sm"
              carouselList={innoCarouselList}
            />
          </div>
        </BodyWrapper>
      </div>
    </main>
  );
}
