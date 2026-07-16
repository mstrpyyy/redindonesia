import { BeforeAfterImage, IBeforeAfter } from "@/app/(user)/components/BeforeAfter"
import { BodyWrapper } from "@/app/(user)/components/BodyWrapper"

interface IBeforeAfterDevice {
  h2: string
  imageList: {title: string, before:IBeforeAfter, after:IBeforeAfter}[]
}

export const  BeforeAfterDevice = ({h2, imageList}:IBeforeAfterDevice) => {
  return (
    <BodyWrapper className="mt-14 mb-24">
      <section>
        <h2 className="h2-format text-center! mb-8">{h2}</h2>

        <div 
          className={`
            grid 
            ${imageList.length > 2 
              ? 'grid-cols-1 md:grid-cols-3'
              : imageList.length > 1 
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1'
            }  
            gap-8 md:gap-5 lg:gap-10
            justify-items-center
          `}
        >
          {imageList.map((item, index) => {
            return (
              <div key={index} className="max-w-120">
                <BeforeAfterImage
                  beforeImage={item.before}
                  afterImage={item.after}
                  className="rounded-4xl aspect-square sm:aspect-3/2 md:aspect-4/5 lg:aspect-square"
                />
                <h3 className="h3-sm-format font-semibold text-center flex-1 mt-4">{item.title}</h3>
              </div>
            )
          })

          }
        </div>

      </section>
    </BodyWrapper>
  )
}
