import { INavbarMenu } from "@/interfaces/general"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { NavMenuLink } from "./NavMenuLink"

interface IDropdownNavButton {
  name: string
  menu: INavbarMenu[]
  isActive: boolean
  level?: number
  parentPath?: string
  onNavigate: () => void
  // Only ever set by a recursive call (never by the top-level Sidebar.tsx
  // usage) — a nested category can have both its own page and sub-categories
  // (ADR-033), so it needs to be a real link as well as an expand/collapse
  // toggle, unlike the always-toggle-only top-level entries.
  href?: string
  isPage?: boolean
}

export const DropdownNavButton = ({
  name,
  menu,
  level = 0,
  parentPath = "",
  onNavigate,
  href,
  isPage
}: IDropdownNavButton) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = () => setIsOpen(prev => !prev)

  const hasNestedMenus = level === 0 && menu.some(item => item.menu)

  // `href` is only ever passed by a recursive call. Requires `isPage` to be
  // explicitly `true` (not just "not false") because the Devices & Products
  // root entries ("Devices"/"Products" — src/lib/data.ts's deviceProductMenu)
  // have `.menu` but no `isPage` at all: they're synthetic grouping labels,
  // not real Category rows, and have no page of their own (desktop's
  // LargeDropdown never links them either — they're plain tab buttons,
  // ParentButton). A real Category node always sets `isPage` as an explicit
  // boolean (see buildCategoryNavMenu), so this only ever clicks through for
  // a confirmed real page.
  const isClickable = href !== undefined && isPage === true

  return (
    <div className={`w-full ${level === 0 ? "flex flex-col items-center" : ""}`}>

      {/* Trigger */}
      <div
        onClick={isClickable ? undefined : toggleOpen}
        className={`
          flex items-center gap-2 py-2 text-white
          ${!isClickable ? "cursor-pointer" : ""}
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
        {isClickable ? (
          <NavMenuLink href={href!} isPage={isPage} onClick={onNavigate} className="flex-1 text-left hover:underline">
            {name}
          </NavMenuLink>
        ) : (
          <span className="flex-1 text-left">{name}</span>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            toggleOpen()
          }}
          aria-label={isOpen ? `Collapse ${name}` : `Expand ${name}`}
          className="shrink-0"
        >
          <ChevronDown
            strokeWidth={1.5}
            className={`transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            size={20}
          />
        </button>
      </div>

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
                    onNavigate={onNavigate}
                    href={fullPath}
                    isPage={item.isPage}
                  />
                ) : (
                  <NavMenuLink
                    href={fullPath}
                    isPage={item.isPage}
                    onClick={onNavigate}
                    className={`block py-2 text-white ${
                      item.isPage === false ? "" : "hover:underline"
                    } ${
                      level <= 2 ? "font-normal" : "font-extralight"
                    }`}
                    style={{
                      paddingLeft: level >= 1 ? `${level * 1}rem` : "0"
                    }}
                  >
                    {item.name}
                  </NavMenuLink>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}