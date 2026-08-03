'use client'

import { useState } from 'react'
import { ChevronRight, GalleryHorizontal, Image as ImageIcon, Layers, Mail, Shield } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'


// "Product & Device" is grouped by entity type (Devices/Products), each with
// its own Categories/Catalogue links — mirrors the data model's own
// partition (a category's `type` must match its products' `type`, entirely
// separate trees) and keeps the create-a-category-then-add-an-item workflow
// for one line inside a single sidebar section instead of two. `groups` is
// only used here; every other section still uses the flat `menu` shape.
const navMenus = [
  {
    name: 'Homepage',
    icon: <GalleryHorizontal size={18} strokeWidth={2} />,
    menu: [
      {
        name: 'Content',
        slug: '/admin/homepage/content',
      },
    ]
  },
  {
    name: 'Products & Devices',
    icon: <Layers size={18} strokeWidth={2}  />,
    groups: [
      {
        name: 'Devices',
        menu: [
          { name: 'Categories', slug: '/admin/product-device/devices' },
          { name: 'Catalogue', slug: '/admin/product-device/devices/items' },
        ],
      },
      {
        name: 'Products',
        menu: [
          { name: 'Categories', slug: '/admin/product-device/products' },
          { name: 'Catalogue', slug: '/admin/product-device/products/items' },
        ],
      },
    ],
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
        name: 'Registration & Documentation',
        slug: '/admin/support/registration-documentation',
      },
      {
        name: 'Warranty & Service',
        slug: '/admin/support/warranty-service',
      },
      {
        name: 'Marcom & Promotion',
        slug: '/admin/support/marcom',
      },
      {
        name: 'Career',
        slug: '/admin/support/career',
      },
    ]
  },
  {
    name: 'Contact',
    icon: <Mail size={18} strokeWidth={2}  />,
    menu: [
      {
        name: 'Content',
        slug: '/admin/contact/content',
      },
      {
        name: 'Form Response',
        slug: '/admin/contact/form-response',
      },
    ]
  },

]

// Every link nested under a menu, groups included — used to decide whether
// that menu should start expanded (it contains the current page) or
// collapsed (the default for everything else).
function menuSlugs(menu: (typeof navMenus)[number]): string[] {
  if (menu.groups) return menu.groups.flatMap((group) => group.menu.map((item) => item.slug))
  return (menu.menu ?? []).map((item) => item.slug)
}

function NavLinks({ items, pathname }: { items: { name: string; slug: string }[]; pathname: string }) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.slug} className="z-10">
          <Link
            href={item.slug}
            className={`flex items-center pl-11 pr-4 py-2 text-sm
              ${pathname === item.slug ? 'border-r-[2px] border-r-brand-red bg-secondary/50' : 'hover:bg-secondary/50 border-r-[2px]'}
            `}
          >
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export const Sidebar = () => {
  const pathname = usePathname()

  // Every menu starts collapsed except the one containing the current page
  // — lazy initializer so this only runs once, not on every pathname change.
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(navMenus.map((menu, index) => [index, menuSlugs(menu).includes(pathname)]))
  )

  const toggleMenu = (index: number) => {
    setOpenMenus((current) => ({ ...current, [index]: !current[index] }))
  }

  return (
    <aside className="w-64 h-screen flex flex-col sticky top-0 self-start shrink-0">
      <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-border" />
      <div className="w-36 mx-auto shrink-0">
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

      {/* `dir="rtl"` puts the (minimalist, left-side) scrollbar on this
          element's left edge; the `dir="ltr"` wrapper immediately inside
          resets text/layout direction for the actual content. */}
      <nav dir="rtl" className="sidebar-scrollbar flex min-h-0 flex-1 flex-col mt-10 overflow-y-auto pb-6">
        <div dir="ltr" className="flex flex-col gap-4">
          {navMenus.map((menu, index) => {
            const isOpen = openMenus[index]
            return (
              <div key={index} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleMenu(index)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 px-4 py-2 hover:bg-secondary/50"
                >
                  {menu.icon}
                  <h2 className="flex-1 text-left text-sm font-medium">{menu.name}</h2>
                  <ChevronRight
                    size={16}
                    strokeWidth={2}
                    className={`text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  />
                </button>
                {isOpen && (
                  menu.groups ? (
                    menu.groups.map((group) => (
                      <div key={group.name} className="flex flex-col">
                        <h3 className="text-muted-foreground pt-1 pb-1 pl-8 pr-4 text-xs font-semibold tracking-wide uppercase">
                          {group.name}
                        </h3>
                        <NavLinks items={group.menu} pathname={pathname} />
                      </div>
                    ))
                  ) : (
                    <NavLinks items={menu.menu ?? []} pathname={pathname} />
                  )
                )}
              </div>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
