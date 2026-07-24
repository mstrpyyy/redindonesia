'use client'

import { Image as ImageIcon, Layers, Shield } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'


const navMenus = [
  {
    name: 'Product & Device',
    icon: <Layers size={18} strokeWidth={2}  />,
    menu: [
      {
        name: 'Products',
        slug: '/admin/product-device/products',
      },
      {
        name: 'Devices',
        slug: '/admin/product-device/devices',
      }
    ]
  },
  {
    name: 'Media',
    icon: <ImageIcon size={18} strokeWidth={2}  />,
    menu: [
      {
        name: 'Articles',
        slug: '/admin/media/articles',
      },
      {
        name: 'Galleries',
        slug: '/admin/media/galleries',
      },
      {
        name: 'Podcast',
        slug: '/admin/media/podcast',
      },
    ]
  },
  {
    name: 'Support',
    icon: <Shield size={18} strokeWidth={2}  />,
    menu: [
      {
        name: 'Marcom & Promotion',
        slug: '/admin/support/marcom',
      },
    ]
  },

]

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <aside className="w-64 h-screen flex flex-col sticky top-0 self-start shrink-0">
      <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-border" />
      <div className="w-36 mx-auto">
        <Link href="/admin">
          <Image
            src={'/image/logo-red-black.png'}
            alt='logo'
            width={362}
            height={91}
            className='w-36 h-auto mt-10'
          />
        </Link>
        <h1 className="mt-2 text-sm font-medium italic">Admin <span className="text-brand-red">Dashboard</span></h1>
      </div>

      <nav className="flex flex-col mt-10 gap-4">
        {navMenus.map((menu, index) => {
          return (
            <div key={index} className="flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2">
                {menu.icon}
                <h2 className="text-sm font-medium">{menu.name}</h2>
              </div>
              <ul className="flex flex-col">
                {menu.menu.map((item, index) => {
                  return (
                    <li key={index} className="z-10" >
                      <a
                        href={item.slug}
                        className={`flex items-center pl-11 pr-4 py-2 text-sm
                          ${pathname === item.slug ? 'border-r-[2px] border-r-brand-red bg-secondary/50' : 'hover:bg-secondary/50 border-r-[2px]'}
                        `}
                      >
                        {item.name}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
