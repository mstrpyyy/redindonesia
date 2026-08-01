import React from 'react'
import { BodyWrapper } from '../BodyWrapper'
import { CatalogueFilter, IFilterList } from './Filter'
import { DeviceCard } from './DeviceCard'
import { IDeviceCardItem } from '@/interfaces/general'

interface IDeviceFilterList {
  deviceList: IDeviceCardItem[]
  // Optional — pages with no real filter taxonomy (e.g. CMS category grids)
  // omit it entirely rather than rendering an empty filter bar.
  filterList?: IFilterList[]
  heading?: React.ReactNode
  emptyMessage?: string
}

export const DeviceFilterList = ({deviceList, filterList, heading, emptyMessage}:IDeviceFilterList) => {
  return (
    <section>
      <h2 className='h2-format my-14'>
        {heading ?? <>Device <span className='text-brand-red'>Catalogue</span></>}
      </h2>

      {filterList && filterList.length > 0 &&
        <CatalogueFilter
          list={filterList}
        />
      }

      {deviceList.length === 0 ? (
        <p className='p-format text-center! my-14 text-neutral-400'>
          {emptyMessage ?? 'No products available yet.'}
        </p>
      ) : (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-10 my-14'>
          {deviceList.map((item, index) => (
            <DeviceCard
              key={index}
              item={item}
              data-aos="fade-up"
              data-aos-duration="1000"
            />
          ))}

        </div>
      )}

    </section>
  )
}
