import { MenuIcon, Search } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { DropdownNavButton } from './SidebarDropdown'
import type { INavbarMenu } from '@/interfaces/general'

interface ISidebar {
  menu: INavbarMenu[],
  pathname: string,
  DROPDOWNSIZE: string,
  TOP_HEIGHT: string,
  setDarkenBg: React.Dispatch<React.SetStateAction<boolean>>
}

export const SidebarMenu = ({ menu: navMenus, pathname, DROPDOWNSIZE, TOP_HEIGHT, setDarkenBg }: ISidebar) => {
  const [open, setOpen] = useState(false)

  const handleOpen = () => {
    setOpen(prev => !prev)
    setDarkenBg(prev => !prev)
  }

  const handleClose = () => {
    setOpen(false)
    setDarkenBg(false)
  }

  return (
    <div className='relative ml-auto md:hidden'>
      {/* TRIGGER */}
      <button 
        aria-label="Open Menu" 
        className="rounded-md hover:bg-white/20 p-2" 
        onClick={handleOpen}
      >
        <MenuIcon aria-hidden className="h-6 w-6" />
      </button>

      {/* MENU */}
      {open && (
        <div
          className={`fixed right-0 w-screen ${DROPDOWNSIZE} ${TOP_HEIGHT}`}
        >
          <div className="h-full bg-black/80 backdrop-blur-md border-t border-t-neutral-400 flex justify-center overflow-y-auto">
            <div className='flex-1 max-w-96 px-4'>
              {/* SEARCH */}
              <div className="relative w-full border-b border-b-neutral-400 py-4">
                <input 
                  className="w-full placeholder:text-neutral-300 transition-all duration-150 border-0 focus:outline-0 pr-6 bg-transparent text-white" 
                  placeholder="Search" 
                />
                <Search 
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-neutral-300" 
                  size={20} 
                />
              </div>

              {/* NAV LIST */}
              <ul className='flex flex-col items-center gap-2 mt-4 pb-10'>
                {navMenus.map((menu, index) => {
                  if (menu.menu) {
                    return (
                      <li key={index}>
                        <DropdownNavButton
                          name={menu.name}
                          isActive={pathname === menu.slug}
                          menu={menu.menu}
                          onNavigate={handleClose}
                        />
                      </li>
                    )
                  }
                  return (
                    <li key={index}>
                      <SidebarNavButton
                        name={menu.name}
                        href={menu.slug ?? ''}
                        isActive={pathname === menu.slug}
                        onNavigate={handleClose}
                      />
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ISidebarNavButton {
  name: string,
  href: string,
  isActive: boolean,
  onNavigate: () => void
}

const SidebarNavButton = ({ name, href, isActive, onNavigate }: ISidebarNavButton) => {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`text-white font-semibold py-2 ${isActive ? 'text-red-500 font-semibold' : 'hover:underline'}`}
    >
      {name}
    </Link>
  )
}