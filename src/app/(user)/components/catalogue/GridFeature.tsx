import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { getSegmentBackgroundColor } from '@/lib/segment-colors'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import React from 'react'

interface ITreatmentList {
  name: string
  svgUrl?: string
}

interface IGridListDevice {
  list: ITreatmentList[]
  header: string
  columns?: '1' | '2'
  /** One of SEGMENT_BACKGROUND_COLOR_VALUES (src/lib/segment-colors.ts). */
  backgroundColor?: string
}

export const GridListDevice = ({ list, header, columns = '2', backgroundColor = 'black' }: IGridListDevice) => {
  const { bgClassName, textClassName } = getSegmentBackgroundColor(backgroundColor)

  return (
    <BodyWrapper className={cn('py-10 md:py-20', bgClassName)} >
      <section className={textClassName} >
        <h2
          className='h2-format text-center mb-10'
          data-aos="fade-up"
          data-aos-duration="500"
        >
          {header}
        </h2>
        <TreatmentGrid list={list} columns={columns} />

      </section>
    </BodyWrapper>
  )
}


const TreatmentGrid = ({list, columns}:{list:ITreatmentList[], columns: '1' | '2'}) => {
  return (
    <div className='flex'
      data-aos="fade-left"
      data-aos-duration="500"
      data-aos-anchor-placement="bottom"
    >
      {/* `w-fit` at every breakpoint (both column counts) so the grid only
          ever takes up as much room as its content needs — `mx-auto` then
          centers that block within the section. With `grid-cols-2` on a
          shrink-to-fit container, the two equal `1fr` tracks both resolve to
          the width of whichever column's content is widest, so the columns
          stay the same width and evenly balanced around a fixed `gap-10`
          instead of stretching to the full section width (which used to
          leave column 2 sitting wherever the halfway point happened to
          fall, not evenly spaced from column 1). Each item's own text stays
          `text-left!` below, only the block as a whole is centered. */}
      <div className={cn(
        'grid grid-cols-1 items-center justify-items-start gap-10 mx-auto w-fit',
        columns === '2' && 'md:grid-cols-2'
      )}>
        {list.map((item, index) => {
          return (
            <div 
              key={index}
              className="flex items-center gap-3 2xl:gap-5"
            >
              {item.svgUrl ? (
                <Image src={item.svgUrl} alt={item.name} width={100} height={100} className='w-12 lg:w-14' />
              ) : (
                // No custom icon from the CMS — a plain bullet dot instead of
                // leaving the row iconless. `bg-current` matches whatever
                // text color the section's backgroundColor resolves to.
                <span className='block size-2.5 shrink-0 rounded-full bg-current' aria-hidden="true" />
              )}
              <p className='p-format text-left! whitespace-pre-line'>{item.name}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}