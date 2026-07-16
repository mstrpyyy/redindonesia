import React from 'react'
import { BodyWrapper } from '../BodyWrapper'
import { CatalogueFilter, IFilterList } from './Filter'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'



interface IDeviceList {
  name: string
  desc: string
  url: string
  imgUrl: string
}

interface IDeviceFilterList {
  deviceList: IDeviceList[]
  filterList: IFilterList[]
  
}

export const DeviceFilterList = ({deviceList, filterList}:IDeviceFilterList) => {
  return (
    <BodyWrapper>
      <section>
        <h2 className='h2-format my-14'>Device <span className='text-brand-red'>Catalogue</span></h2>

        <CatalogueFilter 
          list={filterList}
        
        />

        <div className='grid grid-cols-1 md:grid-cols-2 gap-10 my-14'>
          {deviceList.map((item, index) => {
            return (
              <div 
                data-aos="fade-up"
                data-aos-duration="1000"
                key={index}
                className={`
                  group
                  flex max-sm:items-center max-sm:flex-col gap-5 rounded-2xl 
                  shadow-[0_2px_4px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.25)] 
                  transition-all duration-200 
                  bg-linear-to-br from-brand-peach/20 to-white
                `}
              >
                <div className="w-2/3 max-sm:max-w-[200px] sm:w-3/7 flex">
                  <Image
                    src={item.imgUrl}
                    alt={item.name}
                    width={600}
                    height={600}
                    className="w-full h-auto  object-contain"
                  />
                </div>
                <div className='flex flex-col flex-1 max-sm:pb-5 max-sm:px-5 sm:pr-5 sm:py-8'>
                  <h3 className='h3-format font-semibold'>{item.name}</h3>
                  <p className='p-sm-format text-left! mt-2 mb-6 line-clamp-4'>{item.desc}</p>

                  <Button 
                    asChild
                    variant={'outlineSecondary'}
                    className={`
                      sm:border-neutral-500 sm:text-neutral-500 group-hover:border-black group-hover:text-black
                      bg-transparent hover:bg-black hover:text-white
                      text-base!
                    `}
                  >
                    <Link href={item.url} className='mt-auto w-fit ml-auto'>
                      View Product
                      <ArrowRight className='size-5' />
                    </Link>
                  </Button>

                </div>
              </div>
            )
          })

          }
        

        </div>

      </section>
    </BodyWrapper>
  )
}


