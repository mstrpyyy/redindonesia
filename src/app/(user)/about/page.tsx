import { BodyWrapper } from "@/app/(user)/components/BodyWrapper";
import { AboutWho } from "./(sections)/Who";
import { AboutWhat } from "./(sections)/What";
import { AboutWork } from "./(sections)/Work";
import { AboutHero } from "./(sections)/Hero";
import { AboutVideo } from "./(sections)/Video";


export default function About() {
  return (
    <main>
      <AboutHero/>
      <BodyWrapper className='radial-gradient1 py-20 shadow-md relative z-10'>
        <AboutWho/>
        <div className='flex flex-col lg:flex-row items-center gap-8 lg:gap-10 justify-between mt-16 sm:mt-20 lg:mt-30'>
          <div className="rounded-4xl overflow-hidden w-full lg:flex-1 aspect-video">
            <AboutVideo />
          </div>
          <div className="w-full lg:w-fit">
            <h3 className='h3-format lg:whitespace-nowrap'>Our Mission in Motion</h3>
            <p className='p-sm-format lg:w-0 lg:min-w-full'>
              Discover how we&apos;ve partnered with global leaders to bring premier medical aesthetic solutions directly to Indonesia, redefining what&apos;s possible for local clinicians
            </p>
          </div>
        </div>
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
