import { Settings, ShieldCheck, Users, LucideIcon } from 'lucide-react'
import Image from 'next/image'
import React from 'react'
import { IconImage } from '../_components/iconImage';
import { RadiantPulse } from '../_components/radiantPulse';

const cards: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Users,
    title: 'PROFESSIONAL TRAINING TEAM',
    description:
      'We provide comprehensive clinical training and courses to equip your staff with the technical mastery required to optimize the full potential of our machines and products.',
  },
  {
    icon: Settings,
    title: 'SERVICE DEPARTMENT',
    description:
      'To ensure uninterrupted clinic operations, we provide ongoing after-sales service for all equipment, even after the warranty period has expired.',
  },
  {
    icon: ShieldCheck,
    title: 'PRODUCT WARRANTY',
    description:
      'All equipment and devices provided by us come with a one-year warranty that fully covers any manufacturing technical defects to protect your investment.',
  },
]

export const AboutWork = () => {
  return (
    <section id='about-work' className=''>
      <div
        className="flex max-lg:justify-center"
        data-aos="fade-left"
        data-aos-duration="600"
      >
        <div className="relative">
          <IconImage
            src={'/image/about/red-work-icon.webp'}
            alt='red-work'
            width={1094}
            height={968}
          />
          <RadiantPulse className='top-16!' />
        </div>
      </div>
      <div className="text-justify">
        <p
          className="p-format  font-medium!"
          data-aos="fade-up"
          data-aos-duration="600"
          data-aos-delay="150"
        >
          At RED Indonesia, we believe great technology is only half the battle, the other half is expertise. When you partner with us, you gain two decades of clinical knowledge and a team dedicated to your success. We provide the infrastructure and services your practice demands.
        </p>
        <div className='flex flex-col md:flex-row gap-4 my-10'>
          {cards.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className='flex-1 bg-white shadow-sm rounded-xl px-8 py-6 flex flex-col gap-3'
              data-aos="fade-up"
              data-aos-duration="500"
              data-aos-delay={(index * 100).toString()}
            >
              <Icon size={40} strokeWidth={1.5} className='text-brand-red' />
              <h3 className='text-brand-red h3-sm-format font-semibold'>{title}</h3>
              <p className='p-sm-format'>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
