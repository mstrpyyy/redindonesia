import Link from "next/link";

interface INavButton {
  string: string,
  NAVBAR_HEIGHT: string,
  href: string,
  isWhiteNav: boolean,
  isActive: boolean
}

export const NavButton = ({string, NAVBAR_HEIGHT, href, isWhiteNav, isActive}:INavButton) => {

  return (
    <Link
      href={href}
      className={`flex ${NAVBAR_HEIGHT} items-center relative group ${isActive ? isWhiteNav ? 'text-brand-red font-bold' : 'font-bold' : 'font-base'}`}
    >
      {string}
      <div
        className={`
          absolute h-1 bg-brand-red transition-all duration-150 
          ${isWhiteNav ? 'bottom-0' : 'bottom-4'}
          left-1/2 right-1/2 group-hover:left-0 group-hover:right-0
        `}
      />
    </Link>
  )
}