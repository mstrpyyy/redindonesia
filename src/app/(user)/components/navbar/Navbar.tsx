'use client'


import { Search, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import { NavButton } from "./NavButton"
import { LargeDropdown } from "./LargeDropdown"
import { SearchBar } from "@/app/(user)/components/SearchBar"
import { SmallDropdown } from "./SmallDropdown"
import { SidebarMenu } from "./Sidebar"
import Image from "next/image"
import Link from "next/link"
import type { INavbarMenu } from "@/interfaces/general"

export const Navbar = ({ menus }: { menus: INavbarMenu[] }) => {
  const pathname = usePathname()
  const pathSegment = pathname.split('/')[1] ? '/' + pathname.split('/')[1] : '/'
  const [darkenBg, setDarkenBg] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hideSearch, setHideSearch] = useState(true)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const mobileSearchRef = useRef<HTMLDivElement>(null)

  // Determine if navbar should be white
  // const isWhiteNav = scrolled || pathname !== '/'
  const isWhiteNav = scrolled 
  const NAVBAR_HEIGHT = isWhiteNav ? 'h-14' : 'h-20'
  const TOP_HEIGHT = isWhiteNav ? 'top-14' : 'top-20'
  const DROPDOWNSIZE = isWhiteNav ? 'h-[calc(100vh-56px)]' : 'h-[calc(100vh-80px)]'
  const textColor = isWhiteNav ? 'text-black' : 'text-white'


  const updateScrollEvent = useEffectEvent((isScrolled:boolean)=>{
    setScrolled(isScrolled)
  })
    
  useEffect(() => {
    updateScrollEvent(window.scrollY > 25)
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 25)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleHideSearch = (val: boolean) => {
      setHideSearch(val)

    }
    handleHideSearch(!scrolled && pathname === '/')
  }, [scrolled, pathname])

  useEffect(() => {
    if (!mobileSearchOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileSearchRef.current?.contains(event.target as Node)) setMobileSearchOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [mobileSearchOpen])

  // ${darkenBg && !isWhiteNav ? 'bg-black/70' : isWhiteNav ? 'bg-white shadow-md' : 'bg-linear-to-b from-black to-transparent'}
  return (
    <header 
      className={`
        fixed flex items-center z-40 px-4 text-base transition-all duration-200
        ${NAVBAR_HEIGHT} w-full ${textColor}
        ${darkenBg && !isWhiteNav ? 'bg-black/70' : isWhiteNav ? 'bg-white shadow-md' : ''}
        
      `}
    >
      <Link href={'/'} className="flex-1 max-w-64 lg:max-w-52 mr-5">
       <Image 
         src={isWhiteNav ? "/image/logo-red-black.png" : "/image/logo-red-white.png"} 
         alt="logo" 
         width={362} 
         height={91} 
         className={`${isWhiteNav ? 'w-32' : 'w-32 lg:w-48'}`} 
       />
      </Link>

      <nav className={`max-md:hidden ml-auto mr-8 ${!hideSearch && 'lg:mx-auto'}`}>
        <ul className="flex items-center justify-center gap-4 lg:gap-6 xl:gap-10">
          {
            menus.map((menu, index) => {
              if (menu.type === 'largeDropdown' && menu.menu) {
                return (
                  <li key={index}>
                    <LargeDropdown
                      name={menu.name}
                      NAVBAR_HEIGHT={NAVBAR_HEIGHT}
                      TOP_HEIGHT={TOP_HEIGHT}
                      setDarkenBg={setDarkenBg}
                      isWhiteNav={isWhiteNav}
                      menu={menu.menu}
                    />
                  </li>
                )
              }
              if (menu.type === 'smallDropdown' && menu.menu) {
                return (
                  <li key={index}>
                    <SmallDropdown
                      name={menu.name}
                      NAVBAR_HEIGHT={NAVBAR_HEIGHT}
                      isWhiteNav={isWhiteNav}
                      menu={menu.menu}
                    />
                  </li>
                )
              }
              return (
                <li key={index}>
                  <NavButton
                    NAVBAR_HEIGHT={NAVBAR_HEIGHT}
                    string={menu.name}
                    href={menu.slug ?? ''}
                    isActive={pathSegment === menu.slug}
                    isWhiteNav={isWhiteNav}
                  />
                </li>
              )
            })
          }
        </ul>
      </nav>

      {!hideSearch &&
        <div className="max-lg:hidden flex-1 lg:max-w-52 xl:max-w-64 flex items-center justify-end">
          <SearchBar
            inputClassName={`
              max-lg:hidden w-28 xl:w-50 focus:w-full rounded-full pr-12 focus:pr-9 xl:pr-9 border transition-all duration-150 backdrop-blur-md
              ${isWhiteNav
                ? 'border-neutral-500 placeholder:text-black focus:placeholder:text-neutral-500'
                : 'border-white placeholder:text-neutral-300'
              }
            `}
            dropdownClassName="right-0 w-80 max-w-[calc(100vw-2rem)]"
            placeholder="Search..."
          />
        </div>
      }

      <div ref={mobileSearchRef} className="max-md:hidden lg:hidden relative">
        <button
          aria-label={mobileSearchOpen ? "Close search" : "Open search"}
          onClick={() => setMobileSearchOpen((current) => !current)}
        >
          {mobileSearchOpen ? (
            <X aria-hidden size={20} strokeWidth={3} />
          ) : (
            <Search aria-hidden size={20} strokeWidth={3} />
          )}
        </button>

        {mobileSearchOpen && (
          <div
            className={`
              absolute top-full right-0 z-40 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-md border p-3 shadow-md
              ${isWhiteNav ? 'bg-white' : 'bg-black/90 backdrop-blur-md'}
            `}
          >
            <SearchBar
              inputClassName={`
                w-full rounded-full pr-10 border transition-all duration-150
                ${isWhiteNav
                  ? 'border-neutral-500 placeholder:text-black focus:placeholder:text-neutral-500'
                  : 'border-white placeholder:text-neutral-300'
                }
              `}
              dropdownClassName="left-0 w-full"
              placeholder="Search..."
            />
          </div>
        )}
      </div>

      <SidebarMenu
        menu={menus}
        pathname={pathSegment}
        DROPDOWNSIZE={DROPDOWNSIZE}
        TOP_HEIGHT={TOP_HEIGHT}
        setDarkenBg={setDarkenBg}
      />
    </header>
  )
}