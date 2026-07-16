import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import Image from 'next/image'
import React from 'react'

interface ITreatmentList {
  name: string
  svgUrl?: string
}

interface IGridListDevice {
  list: ITreatmentList[]
  header: string
}

export const GridListDevice = ({ list, header }: IGridListDevice) => {
  return (
    <BodyWrapper className='bg-black py-10 md:py-20' >
      <section className='text-white' >
        <h2
          className='h2-format text-center mb-10'
          data-aos="fade-up"
          data-aos-duration="500"
        >
          {header}
        </h2>
        <TreatmentGrid list={list} />

      </section>
    </BodyWrapper>
  )
}


const TreatmentGrid = ({list}:{list:ITreatmentList[]}) => {
  return (
    <div className='flex'>
      <div className='grid grid-cols-1 md:grid-cols-2 items-center justify-items-start gap-10 w-fit md:w-full mx-auto'>
        {list.map((item, index) => {
          return (
            <div 
              key={index}
              className="flex items-center gap-3 2xl:gap-5"
              data-aos="fade-left"
              data-aos-duration="500"
              data-aos-delay={index*150}
            >
              {item.svgUrl &&
                <Image src={item.svgUrl} alt={item.name} width={100} height={100} className='w-12 lg:w-14' />
              }
              <p className='p-format text-left!'>{item.name}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}