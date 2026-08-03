import Link from "next/link"

interface INavMenuLink {
  href: string
  isPage?: boolean
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  children: React.ReactNode
}

// A breadcrumb-only category (`isPage: false`, ADR-033) isn't a real page yet
// — it renders as plain, non-interactive text (default/text cursor, no href)
// instead of a link, in both LargeDropdown and SidebarDropdown. `isPage`
// undefined (every static Products/Support/Media entry) behaves as a normal
// link, same as before this distinction existed.
export const NavMenuLink = ({ href, isPage, className, style, onClick, children }: INavMenuLink) => {
  if (isPage === false) {
    return (
      <span className={`cursor-text ${className ?? ""}`} style={style}>
        {children}
      </span>
    )
  }

  return (
    <Link href={href} className={className} style={style} onClick={onClick}>
      {children}
    </Link>
  )
}
