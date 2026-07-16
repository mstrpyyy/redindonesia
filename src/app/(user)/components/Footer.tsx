import { LinkedinOutlinedRounded, TiktokOutlinedRounded } from '@lineiconshq/react-lineicons'
import { Facebook, Instagram, Linkedin, Mail, Map, MapPin, MapPinned, Phone } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

const companyInfoList = [
  {
    icon: <Mail />,
    href: 'mailto:info@red-indonesia.co.id',
    text: 'info@red-indonesia.co.id'
  },
  {
    icon: <Phone />,
    href: 'tel:+622145850088',
    text: '+62 21-4585-0088'
  }
]

// WARNING! CHANGE PACKAGE
const socialMediaList = [
  {
    icon: <Instagram />,
    href: 'https://www.instagram.com/radian.elok.distriversa/',
    text: '@radian.elok.distriversa'
  },
  {
    icon: <Facebook />,
    href: 'https://www.facebook.com/radianelok/',
    text: 'PT. Radian Elok Distriversa'
  },
  {
    icon: <Linkedin />,
    href: 'https://www.instagram.com/radian.elok.distriversa/',
    text: 'PT. Radian Elok Distriversa'
  },
  {
    icon: <TiktokOutlinedRounded />,
    href: 'https://www.facebook.com/radianelok/',
    text: '@radianelok'
  }
]

const supportList = [
  {
    href: '/',
    text: 'Registration & Documentation'
  },
  {
    href: '/',
    text: 'Warranty & Service'
  },
  {
    href: '/',
    text: 'Marcom Inquiry'
  },
  {
    href: '/',
    text: 'Career '
  },
]

const menuList = [
  {
    href: '/',
    text: 'Home'
  },
  {
    href: '/',
    text: 'About'
  },
  {
    href: '/',
    text: 'Devices'
  },
  {
    href: '/',
    text: 'Media'
  },
  {
    href: '/',
    text: 'Support'
  },
  {
    href: '/',
    text: 'Contact'
  },
  
]

export const Footer = () => {
  return (
    <footer className='bg-black text-white flex max-md:flex-col gap-5 xl:gap-10 2xl:gap-16 px-10 2xl:px-20 py-10 text-xs xl:text-base font-light'>
      {/* COMPANY INFO */}
      <div className='space-y-6 mr-auto w-full md:w-60 2xl:w-72'>
        <Image alt='logo red' src={'/image/logo-red-white.png'} width={362} height={91} className='w-full max-w-60 2xl:max-w-72' />

        <div className="h-44 w-full rounded-lg overflow-hidden">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.83203159042!2d106.90502837603692!3d-6.1532452603146455!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f54432d9c011%3A0xbae52612408387b5!2sRadian%20Elok%20Distriversa%2C%20PT.!5e0!3m2!1sen!2sid!4v1770731343650!5m2!1sen!2sid"
            width="100%"
            height="100%"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade">
          </iframe>
        </div>

        <div className='flex items-center gap-4'>
          <MapPinned className='text-red-500 size-8 stroke-[1.5]' />
          <p className='leading-6 text-xs'>
            Graha SKG-GN,<br className='max-md:hidden'/>
            Jl. Raya Kelapa Nias Blok GN-5,{' '}<br className='max-md:hidden'/>
            Kelapa Gading Barat,{' '}<br className='2xl:hidden' />
            Jakarta Utara 14240,{' '}<br className='max-md:hidden'/>
            INDONESIA<br className='max-md:hidden'/>
          </p>
        </div>        
      </div>

      <div className='grid xs:grid-cols-2 lg:grid-flow-col auto-cols-max gap-5 xl:gap-10'>
        {/* CONTACT */}
        <div>
          <FooterH2>Contact</FooterH2>
          <div>
            {companyInfoList.map((item, index) => {
              return (
                <MenuLink
                  key={index}
                  icon={item.icon}
                  href={item.href}
                  text={item.text}
                />
              )
            })
            }
          </div>
        </div>

        {/* SOCIAL MEDIA */}
        <div className=''>
            <FooterH2>Social Media</FooterH2>
            
            <div>
              {socialMediaList.map((item, index) => {
                return (
                  <MenuLink
                    key={index}
                    icon={item.icon}
                    href={item.href}
                    text={item.text}
                  />
                )
              })
              }
            </div>
        </div>

        {/* HELP */}
        <div className=''>
          <FooterH2>Support</FooterH2>
          
          <nav>
            {supportList.map((item, index) => {
              return (
                <MenuLink
                  key={index}
                  href={item.href}
                  text={item.text}
                />
              )
            })
            }
          </nav>
        </div>


        {/* MENU */}
        <div className=''>
          <FooterH2>Menu</FooterH2>
          
          <nav>
            {menuList.map((item, index) => {
              return (
                <MenuLink
                  key={index}
                  href={item.href}
                  text={item.text}
                />
              )
            })
            }
          </nav>
        </div>
      </div>

    </footer>
  )
}


const MenuLink = ({ icon, href, text, className }:{ icon?: React.ReactNode, href: string, text: string, className?: string }) => {
  return (
    <div className={`flex items-center  gap-2 mb-4 ${className ?? ''}`}>
      {icon && icon}
      <a
        href={href}
        className="hover:underline"
      >
        {text}
      </a>
    </div>
  )
}

const FooterH2 = ({children}:{children:React.ReactNode}) => {
  return (
    <h2 className='text-red-500 font-bold text-xl lg:text-2xl xl:text-3xl mb-6'>{children}</h2>
  )
}