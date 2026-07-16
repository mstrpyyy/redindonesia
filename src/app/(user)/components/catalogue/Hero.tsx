import { Breadcrumbs } from '@/app/(user)/components/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { FileDown } from 'lucide-react'
import Image from 'next/image'

interface IHeroDevice {
  title: string
  description: string
  imgUrl: string
  imgAlt: string
  children?: React.ReactNode
  heroDocs?: {
    title: string
    href: string
    icon?: React.ReactNode
  }[]
}

export const HeroDevice = ({title, description, imgUrl, imgAlt, children, heroDocs}:IHeroDevice) => {
  return (
    <section className='w-full h-svh relative flex flex-col px-5 sm:px-20 pb-10'>
      <div className='text-white mt-24 z-30'>
        <Breadcrumbs />
      </div>
      <div className='text-brand-peach z-30  my-auto'>
        <h1 className='h2-format text-shadow'>
          {title}
        </h1>
        <h2 className='h2-sm-format lg:text-3xl! text-shadow'>
          {description}
        </h2>
        {heroDocs && 
          <div className='mt-2'>
            <p className='text-xs font-medium text-neutral-300 mb-2'>Download Documents</p>
            <div className='flex gap-4 items-center'>
                {heroDocs.map((doc, index) => {
                  return (
                    <Button variant={'glass'} key={index} className=' h-8 gap-2 rounded-full text-xs ' asChild>
                      <a href={doc.href} target='_blank' rel='noopener noreferrer'>
                        <p className='text-left'>
                          <span className='block font-medium text-xs'>{doc.title}</span>
                        </p>
                        {doc.icon ?
                          doc.icon
                          :
                          <FileDown size={20} strokeWidth={1.5}  />
                        }
                      </a>
                    </Button>
                  )
                })
              }
            </div>
          </div>
        }
      </div>
      {children}


      <Image
        src={imgUrl}
        alt={imgAlt}
        fill
        priority
        sizes="100vw"
        className='object-cover object-top z-0'
      />
    </section>
  )
}
