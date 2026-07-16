import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface IFilterList {
  name: string
  queryName: string
  options: {name: string, value: string}[]
}

interface ICatalogueFilter {
  list: IFilterList[]
}

export const CatalogueFilter = ({list}:ICatalogueFilter) => {
  return (
    <div className='flex items-center gap-5 justify-between max-md:hidden'>
      {list &&
        list.map((item, index) => {
          return (
              <Select key={index} defaultValue={item.options[0].value}>
                <SelectTrigger className="w-full pt-8 pb-6 relative text-lg font-medium" >
                  <SelectValue placeholder={item.name} />
                  <label htmlFor="" className='absolute top-0 -translate-y-1/2 left-2 bg-white text-brand-red px-1 font-normal text-base'>
                    {item.name}
                  </label>
                </SelectTrigger>
                <SelectContent align='end' position='popper'> 
                  {item.options.map((option, idx) => {
                    return (
                      <SelectItem className='text-lg py-2' key={option.value} value={option.value}>{option.name}</SelectItem>
                    )
                  })
                  }
                </SelectContent>
              </Select>
          )})
        }
      <Button className='h-14 w-32'>
        Filter
      </Button>

    </div>
  )
}