import React from 'react'
import { BodyWrapper } from '../BodyWrapper'
import { CatalogueFilter, IFilterList } from './Filter'
import { DeviceCard } from './DeviceCard'
import { CategoryCard } from './CategoryCard'
import { IDeviceCardItem } from '@/interfaces/general'

interface IDeviceFilterList {
  deviceList: IDeviceCardItem[]
  // Optional — pages with no real filter taxonomy (e.g. CMS category grids)
  // omit it entirely rather than rendering an empty filter bar.
  filterList?: IFilterList[]
  heading?: React.ReactNode
  emptyMessage?: string
  // "category" renders `CategoryCard` (full-bleed banner, centered title/
  // description/CTA) instead of the default product `DeviceCard` — used for
  // the "Browse Category" sub-category grid (CategoryPageView.tsx).
  cardVariant?: 'product' | 'category'
}

export const DeviceFilterList = ({deviceList, filterList, heading, emptyMessage, cardVariant = 'product'}:IDeviceFilterList) => {
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
          {deviceList.map((item, index) =>
            cardVariant === 'category' ? (
              <CategoryCard
                key={index}
                item={item}
                data-aos="fade-up"
                data-aos-duration="1000"
              />
            ) : (
              <DeviceCard
                key={index}
                item={item}
                data-aos="fade-up"
                data-aos-duration="1000"
              />
            )
          )}

        </div>
      )}

    </section>
  )
}
