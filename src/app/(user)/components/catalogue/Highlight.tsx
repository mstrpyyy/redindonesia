import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import Image from 'next/image'

interface IHighlightDevice {
  header: string
  text: string
  image: string
  textSide: 'left' | 'right'
}

export const HighlightDevice = ({ header, text, image, textSide }: IHighlightDevice) => {
  return (
    <BodyWrapper className='my-10 md:my-14'>
      <section 
        data-aos={textSide === 'left' ? 'fade-up-left' : 'fade-up-right'}
        data-aos-duration="1000"
        className={`
          flex gap-6 md:gap-10 2xl:gap-20 items-center 
          ${textSide === 'left' ? 'flex-col md:flex-row' : 'flex-col md:flex-row-reverse'}
        `}
      >
        <div className='flex-1 space-y-2 md:space-y-4'>
          <h2 className='h2-md-format xl:text-3xl!'>{header}</h2>
          <p className='max-lg:text-sm! max-lg:leading-7! p-format'>{text}</p>
        </div>

        <Image 
          alt='alma-harmony-2'
          src={image}
          width={640}
          height={540}
          className={`
            w-full md:w-60 lg:w-90 2xl:w-95 aspect-2/1 md:aspect-3/4 lg:aspect-square object-cover object-center max-md:rounded-2xl
            ${textSide === 'left' ? 'md:rounded-tl-[50px] md:rounded-br-[50px]' : 'md:rounded-tr-[50px] md:rounded-bl-[50px]'}
            
          `}
        />
      </section>
    </BodyWrapper>


  )
}
