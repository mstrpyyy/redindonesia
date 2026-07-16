import { ChevronDown } from "lucide-react"
import { Fragment, useRef, useState, useEffect } from "react"
import Link from "next/link"
import { INavbarMenu } from "@/interfaces/general"

interface ILargeDropdown {
  name: string,
  NAVBAR_HEIGHT: string,
  TOP_HEIGHT: string,
  isWhiteNav: boolean,
  setDarkenBg: React.Dispatch<React.SetStateAction<boolean>>
  menu: INavbarMenu[]
}

export const LargeDropdown = ({ name, NAVBAR_HEIGHT, TOP_HEIGHT, isWhiteNav, setDarkenBg, menu }: ILargeDropdown) => {
  const [open, setOpen] = useState(false)
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [activeParentSlug, setActiveParentSlug] = useState(menu[0].slug)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  
  const activeMenu = menu.find(menu => menu.slug === activeParentSlug)

  // Detect if it's a touch device
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
        setDarkenBg(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open, setDarkenBg])

  const handlePointerEnter = () => {
    if (isTouchDevice) return // Don't handle hover on touch devices
    
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setOpen(true)
    setDarkenBg(true)
  }

  const handlePointerLeave = () => {
    if (isTouchDevice) return // Don't handle hover on touch devices
    
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false)
      setDarkenBg(false)
    }, 100)
  }

  const handleButtonClick = () => {
    setOpen(!open)
    setDarkenBg(!open)
  }

  return (
    <div
      ref={dropdownRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className="relative"
    >
      {/* Trigger */}
      <button 
        onClick={handleButtonClick}
        className={`font-base text-base gap-1 ${isWhiteNav ? 'text-black' : 'text-white'} flex items-center relative ${NAVBAR_HEIGHT}`}
      >
        <span>{name}</span>
        <ChevronDown strokeWidth={1.5} />
        <div
          className={`
            absolute h-1 bg-brand-red transition-all duration-150
            ${isWhiteNav ? 'bottom-0' : 'bottom-4'}
            ${open ? 'left-0 right-0' : 'left-1/2 right-1/2'}
          `}
        />
      </button>

      {open && (
        <div
          className={`fixed left-0 w-screen h-screen md:max-h-150 lg:max-h-100 text-white ${TOP_HEIGHT}`}
        >
          <div className="h-full bg-black/80 backdrop-blur-md border-y border-t-neutral-400 border-b-neutral-700 flex py-4">
            <div className="flex flex-col h-full w-64 border-r px-4">
               {menu.map((parent, index) => (
                  <Fragment key={parent.slug}>
                    <ParentButton
                      name={parent.name}
                      slug={parent.slug!}
                      activeParentSlug={activeParentSlug}
                      setActiveParentSlug={setActiveParentSlug}
                    />

                    {index !== menu.length - 1 && (
                      <div className="w-full border-t my-4" />
                    )}
                  </Fragment>
                ))}
            </div>
            <MenuList
              activeMenu={activeMenu!}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface IParentButton {
  name: string,
  slug: string,
  activeParentSlug: string | null,
  setActiveParentSlug: React.Dispatch<React.SetStateAction<string | null>> 
}

const ParentButton = ({name, slug, activeParentSlug, setActiveParentSlug}:IParentButton) => {

  return (
    <button 
      onClick={() => setActiveParentSlug(slug)}
      className={`
        flex-1 flex items-center p-8 text-2xl
        ${activeParentSlug === slug ? 'bg-brand-red' : 'hover:bg-brand-red/50'}
      `}
    >
      {name}
    </button>
  )
}


const MenuList = ({activeMenu}: {activeMenu: INavbarMenu}) => {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 px-12 py-8 flex-1 overflow-y-auto scrollbar-thumb-only">
      {activeMenu?.menu?.map((menu) => (
        <div key={menu.slug}>
          <Link 
            href={`/${activeMenu.slug}/${menu.slug}`} 
            className="font-bold text-red-500 text-lg my-4 block w-fit hover:underline"
          >
            {menu.name}
          </Link>

          {menu.menu?.map((child) => (
            <div key={child.slug}>
              <Link 
                href={`/${activeMenu.slug}/${menu.slug}/${child.slug}`} 
                className={`mt-4 mb-2 block w-fit hover:underline font-normal`}
              >
                {child.name}
              </Link>

              {child.menu?.map((grandchild) => (
                <Link 
                  key={grandchild.slug}
                  href={`/${activeMenu.slug}/${menu.slug}/${child.slug}/${grandchild.slug}`} 
                  className="font-extralight pl-6 my-2 block w-fit hover:underline"
                >
                  {grandchild.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}