import { INavbarMenu } from "@/interfaces/general"
import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { Fragment, useState } from "react"

interface ISmallDropdown {
  name: string,
  NAVBAR_HEIGHT: string,
  isWhiteNav: boolean
  menu: INavbarMenu[]
}

export const SmallDropdown = ({name, NAVBAR_HEIGHT, isWhiteNav, menu}: ISmallDropdown) => {
  const [isActive, setIsActive] = useState(false)

  return (
    <div
      className="relative"
      onPointerEnter={() => setIsActive(true)}
      onPointerLeave={() => setIsActive(false)}
    >
      <button
        className={`font-base text-base p-0 gap-1 ${isWhiteNav ? 'text-black' : 'text-white'} flex items-center relative ${NAVBAR_HEIGHT}`}
      >
        <span>{name}</span>
        <ChevronDown strokeWidth={1.5} />
        <div 
          className={`
            absolute h-1 bg-brand-red
            ${isWhiteNav ? 'bottom-0' : 'bottom-4'}
            transition-all duration-150
            ${isActive ? 'left-0 right-0' : 'left-1/2 right-1/2 group-hover:left-0 group-hover:right-0'} 
          `}
        />
      </button>
      {isActive &&
        <div
          className={`
            h-fit w-54 bg-black/80 backdrop-blur-md border border-neutral-700 absolute top-full left-1/2 -translate-x-1/2 overflow-hidden
            ${isWhiteNav ? '' : '-translate-y-4'}
          `}
        >
          <ul className="flex flex-col items-center">
            {menu.map((item, index) => {
              return (
                <Fragment key={index}>
                  <li className="w-full block hover:bg-white/10">
                    <Link href={item.slug ?? '/'} className="text-white p-4 w-full block font-light">
                      {item.name}
                    </Link>
                  </li>
                  {index !== menu.length-1 &&
                    <div className="w-45 border-t border-t-neutral-400" />
                  }
                </Fragment>
              )
            })}
          </ul>
        </div>
      }
    </div>
  )
}