"use client"

import { CircleStar, Globe, HeartHandshake, ShieldCheck, BadgeCheck, UserRoundCog } from 'lucide-react'
import Image from 'next/image'

const qualityList = [
  {
    icon: <BadgeCheck  size={40} strokeWidth={2} className='text-brand-red'  />,
    title: 'TRUSTED & EXPERIENCED TEAM',
    description: 'With over two decades of industry leadership, our team brings a wealth of clinical knowledge and strategic insight to every partnership, ensuring you are supported by true experts.',
  },
  {
    icon: <Globe size={40} strokeWidth={2} className='text-brand-red'  />,
    title: 'ESTABLISHED NATIONWIDE NETWORK',
    description: 'Our extensive distribution and support network spans across Indonesia, providing top-tier dermatologists and surgeons with seamless access to global innovations and localized care.',
  },
  {
    icon: <CircleStar size={40} strokeWidth={2} className='text-brand-red'  />,
    title: 'GOLD STANDARD CURATION',
    description: 'We meticulously scour the globe for clinically proven, high-performance brands from Europe and the USA, ensuring your clinic stays ahead of industry trends with safe and effective technology.',
  },
  {
    icon: <UserRoundCog size={40} strokeWidth={2} className='text-brand-red'  />,
    title: 'PROFESSIONAL TRAINING TEAM',
    description: 'We provide comprehensive training and clinical courses to empower your staff with the technical mastery needed to harness the full potential of our devices and products.',
  },
  {
    icon: <HeartHandshake size={40} strokeWidth={2} className='text-brand-red'  />,
    title: 'TECHNICAL SUPPORT DEPARTMENT',
    description: 'To ensure your clinic operates without interruption, we guarantee continuous after-sales services for all equipment, even after the warranty period concludes.',
  },
  {
    icon: <ShieldCheck size={40} strokeWidth={2} className='text-brand-red'  />,
    title: 'PRODUCT WARRANTY PERIOD',
    description: 'All equipment and devices supplied by RED come with a one-year warranty covering all factory technical defects to ensure your investment remains fully protected.',
  },
]

export const ChooseUsHomeSection = () => {

  return (
    <section className='flex relative gap-20 py-20'>
      <div className=' flex-1'>
        <h2 className='mb-10 h2-format'>
          WHY CHOOSE{' '}<span className='text-brand-red'>RED</span>{' '}?
        </h2>

         {qualityList.map((item, index) => {
          return (
            <div
              key={index}
              className='flex flex-col gap-4 border-t border-t-neutral-200 py-10'
              data-aos="zoom-in-right"
              data-aos-easing="ease-out"
              data-aos-duration="500"
              data-aos-offset="250"
            
            >
              <div className='flex items-center gap-4'>
                {item.icon}
                <h3 className='h3-format'>{item.title}</h3>
              </div>
              <p className='p-format'>{item.description}</p>
            </div>
          )
        })
        }

      </div>

      <div className='flex-1 relative max-lg:hidden'>
        <Image
          alt='fixed image'
          src='/image/home/hand-holding-transparent.webp'
          width={683}
          height={715}
          className='fixed bottom-0 h-[48vw] w-[48vw] right-0 -z-40' 
        />
      </div>

      <div className='w-screen h-screen fixed top-0 left-0 -z-40'/>


    </section>
  )
}
