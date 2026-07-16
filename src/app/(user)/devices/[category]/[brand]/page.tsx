import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { HeroDevice } from '../../../components/catalogue/Hero'
import { MediaDevice } from '@/app/(user)/components/catalogue/Media'
import { CenteredTextDevice } from '@/app/(user)/components/catalogue/TextCenter'
import { DeviceFilterList } from '@/app/(user)/components/catalogue/DeviceList'

const filterList = [
  {
    name: 'Categories',
    queryName: 'category',
    options: [
      {
        name: 'All',
        value: 'all',
      },
      {
        name: 'Body',
        value: 'body',
      },
      {
        name: 'Hair',
        value: 'hair',
      },
      {
        name: 'Sexual Wellness',
        value: 'sexual-wellness',
      },
      {
        name: 'Skin',
        value: 'skin',
      }
    ]
  },
  {
    name: 'Types of Treatments',
    queryName: 'treatment',
    options: [
      {
        name: 'All',
        value: 'all',
      },
      {
        name: 'Acne',
        value: 'acne',
      },
      {
        name: 'Body Contouring & Tightening',
        value: 'body-contouring-tightening',
      },
      {
        name: 'Carbon Peel',
        value: 'carbon-peel',
      },
      {
        name: 'Cellulite',
        value: 'cellulite',
      },
      {
        name: 'Erectile Dysfunction',
        value: 'erectile-dysfunction',
      },
      {
        name: 'Eyelid Lift',
        value: 'eyelid-lift',
      },
      {
        name: 'Face Contouring',
        value: 'face-countouring',
      },
      {
        name: 'Feminine Health',
        value: 'feminine-health',
      },
    ]
  },
  {
    name: 'Technologies',
    queryName: 'technology',
    options: [
      {
        name: 'All',
        value: 'all',
      },
      {
        name: 'Hygrid',
        value: 'hygrid',
      },
      {
        name: 'Impact',
        value: 'impact',
      },
      {
        name: 'Pixel RF/Microplasma',
        value: 'pixel-rf-microplasma',
      },
      {
        name: 'SHR',
        value: 'shr',
      },
      {
        name: 'Ultrawave',
        value: 'ultrawave',
      },
    ]
  }
]

const deviceList = [
  {
    name: 'Alma Harmony',
    desc: 'Cutting-edge multi-platform that integrates advanced technologies for high-performance treatments.',
    url: '/devices/medical-aesthetics/alma-laser/alma-harmony',
    imgUrl: '/image/device-card/Alma-Harmony-card.webp',
  },
  {
    name: 'Alma Hybrid',
    desc: 'Bringing together a unique combination of three powerful energies, Alma Hybrid sets a new standard in skin rejuvenation, resurfacing and scar treatment. With a dual laser strategy that delivers a fully customizable ratio of ablative and non-ablative wavelengths, Alma Hybrid offers limitless options and ultimate control that go far beyond standard fractional laser.',
    url: '/devices/medical-aesthetics/alma-laser/alma-harmony',
    imgUrl: '/image/device-card/Alma-Hybrid-card.webp',
  },
  {
    name: 'Alma Prime',
    desc: 'The most advanced workstation for body and face contouring, skin tightening and aesthetic enhancement, Accent Prime combines the latest innovations in ultrasound and radio frequency technologies to deliver effective, highly-customized treatments, with natural, long-lasting results from head to toe.',
    url: '/devices/medical-aesthetics/alma-laser/alma-harmony',
    imgUrl: '/image/device-card/Alma-Prime-card.webp',
  },
  {
    name: 'Alma PrimeX',
    desc: 'The ultimate offering in aesthetics, Alma PrimeX combines innovative, state-of-the-art radio frequency (RF) and ultrasound (US) technologies that are already established and trusted by practitioners around the world, in a single device. Delivering remarkable results, the platform enables practitioners to offer a full range of treatments, for body and face.',
    url: '/devices/medical-aesthetics/alma-laser/alma-harmony',
    imgUrl: '/image/device-card/Alma-PrimeX-card.webp',
  },
  {
    name: 'Alma-Q',
    desc: 'Featuring the most powerful Q-Switch Nd:YAG 1064/532nm laser treatment solution available, unique technological innovations give Alma-Q unmatched power and versatility for treating a wide range of aesthetic dermal indications, such as tattoos and pigmentations, skin rejuvenation, open pores and rosacea.',
    url: '/devices/medical-aesthetics/alma-laser/alma-harmony',
    imgUrl: '/image/device-card/Alma-Q-card.webp',
  },
  {
    name: 'Harmony XL PRO',
    desc: 'This multi-application platform is a powerful and versatile solution for a wide range of aesthetic treatments, maximizing the potential of numerous energy-based technologies, achieving outstanding results, and creating endless business opportunities.',
    url: '/devices/medical-aesthetics/alma-laser/alma-harmony',
    imgUrl: '/image/device-card/Alma-XL-Pro-card.webp',
  },
]


export default function Page() {
  return (
    <main className=''>
      {/* HERO */}
      <HeroDevice 
        title='Alma Laser'
        description='The best platforms this world has to offer'
        imgUrl='/image/alma-laser-banner.png'
        imgAlt='Alma Laser'
      />

      <div className='pb-10'>
          {/* TEXT CENTER */}
        <CenteredTextDevice
          h2={'Alma Lasers is a global innovator in laser, light-based, radio-frequency, and ultrasound solutions for aesthetic and surgical markets.'}
          h2Class='h2-sm-format text-pretty!'
          p={`With one of the industry's most comprehensive portfolios of products and platforms, Alma Lasers leverages the latest technologies to deliver advanced devices that address a broad range of aesthetic, medical, and surgical concerns worldwide.`}
        />

        {/* MEDIA */}
        <MediaDevice 
          videoUrl='https://www.youtube-nocookie.com/embed/mdvzJe6g-Eo'
        />

        <DeviceFilterList 
          deviceList={deviceList}
          filterList={filterList}
        />
      </div>


      
     

    </main>
  )
}
