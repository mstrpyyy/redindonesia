import { INavbarMenu } from "@/interfaces/general"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

interface IDropdownNavButton {
  name: string
  menu: INavbarMenu[]
  isActive: boolean
  level?: number
  parentPath?: string
}

export const DropdownNavButton = ({
  name,
  menu,
  level = 0,
  parentPath = ""
}: IDropdownNavButton) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = () => setIsOpen(prev => !prev)

  const hasNestedMenus = level === 0 && menu.some(item => item.menu)

  return (
    <div className={`w-full ${level === 0 ? "flex flex-col items-center" : ""}`}>
      
      {/* Trigger */}
      <button
        onClick={toggleOpen}
        className={`
          flex items-center gap-2 py-2 text-white
          ${
            level === 0
              ? "font-bold"
              : level === 1
              ? "font-semibold justify-between w-full"
              : level === 2
              ? "font-medium justify-between w-full"
              : "font-normal justify-between w-full"
          }
        `}
        style={{ paddingLeft: level >= 2 ? `${(level - 1) * 1}rem` : "0" }}
      >
        <span>{name}</span>
        <ChevronDown
          strokeWidth={1.5}
          className={`transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          size={20}
        />
      </button>

      {/* Content */}
      <div
        className={`transition-all duration-300 ease-in-out w-full ${
          isOpen ? "max-h-screen opacity-100 overflow-y-auto" : "max-h-0 opacity-0 overflow-hidden"
        }`}
      >
        <ul
          className={`flex flex-col gap-2 mt-2 ${
            level === 0 && !hasNestedMenus
              ? "items-center text-center font-extralight"
              : ""
          }`}
        >
          {menu.map((item, index) => {
            const fullPath = item.slug
              ? `${parentPath}/${item.slug}`.replace(/\/+/g, "/")
              : parentPath

            return (
              <li key={index} className={level > 0 ? "w-full" : ""}>
                {item.menu ? (
                  <DropdownNavButton
                    name={item.name}
                    menu={item.menu}
                    isActive={false}
                    level={level + 1}
                    parentPath={fullPath}
                  />
                ) : (
                  <Link
                    href={fullPath}
                    className={`block py-2 hover:underline text-white ${
                      level <= 2 ? "font-normal" : "font-extralight"
                    }`}
                    style={{
                      paddingLeft: level >= 1 ? `${level * 1}rem` : "0"
                    }}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}