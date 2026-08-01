import { BodyWrapper } from "@/app/(user)/components/BodyWrapper";
import { VideoTextSection } from "@/app/(user)/components/VideoTextSection";
import { AboutWho } from "./(sections)/Who";
import { AboutWhat } from "./(sections)/What";
import { AboutWork } from "./(sections)/Work";
import { AboutHero } from "./(sections)/Hero";


export default function About() {
  return (
    <main>
      <AboutHero/>
      <BodyWrapper className='radial-gradient1 py-20 shadow-md relative z-10'>
        <AboutWho/>
        <VideoTextSection
          className='mt-16 sm:mt-20 lg:mt-30'
          videoId="O2o8r9zxD40"
          videoTitle="We are radian elok distriversa"
          thumbnailUrl="/image/about/about-banner-xl.webp"
          heading="Our Mission in Motion"
          description="Discover how we've partnered with global leaders to bring premier medical aesthetic solutions directly to Indonesia, redefining what's possible for local clinicians"
        />
      </BodyWrapper>
      <BodyWrapper className="py-20 bg-secondary">
        <AboutWhat/>
      </BodyWrapper>
      <BodyWrapper className="radial-gradient2 py-20 shadow-[0_-2px_6px_0px_rgba(0,0,0,0.12)] relative z-10">
        <AboutWork/>
      </BodyWrapper>
    </main>
  )
}
