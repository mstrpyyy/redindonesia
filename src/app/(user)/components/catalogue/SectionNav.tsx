import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import Link from 'next/link'

interface ISectionNavDevice {
  name: string
  href: string
}



export const SectionNavDevice = ({list}:{list:ISectionNavDevice[]}) => {
  return (
    <section className='bg-neutral-200'>
      <BodyWrapper>
        <nav className='flex justify-evenly max-sm:hidden'>
          {list.map((item, index) => {
            return (
              <Link
                key={index}
                href={item.href}
                className={`flex items-center gap-2 py-4 text-xs md:text-sm 2xl:text-base hover:underline ${index === 0 ? 'text-brand-red font-semibold' : 'text-neutral-600'}`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </BodyWrapper>      
    </section>
  )
}
