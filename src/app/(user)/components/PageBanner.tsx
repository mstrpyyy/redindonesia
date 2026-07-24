import Image from 'next/image'
import { NavbarBg } from './navbar/NavbarBg'

interface IPageBanner {
  defImage: string
  mdImage?: string
  smImage?: string
  alt: string
  children: React.ReactNode
}

export const PageBanner = ({ defImage, smImage, mdImage, children, alt }: IPageBanner) => {
  return (
     <section className="h-[65vh] min-h-75 w-full relative">
      <NavbarBg />
      <Image 
        src={smImage ? smImage : defImage}
        alt={alt}
        fill
        priority
        sizes="100vw "
        className='object-cover object-center -z-10 block sm:hidden'
      />
      <Image 
        src={mdImage ? mdImage : defImage}
        alt={alt}
        fill
        priority
        sizes="100vw "
        className='object-cover object-center -z-10 hidden sm:block lg:hidden'
      />
      <Image 
        src={defImage}
        alt={alt}
        fill
        priority
        sizes="100vw "
        className='object-cover object-center -z-10 hidden lg:block'
      />
      <div className="absolute left-0 w-full bottom-0 bg-linear-to-t from-black/90 to-transparent z-0 h-2/3"/>

      <h1 className="text-shadow-md absolute bottom-14 left-1/2 -translate-x-1/2 w-full text-center banner-title font-bold text-balance">
        {children}
      </h1>      
    </section>
  )
}
