import Image from 'next/image'

const credibleList = [
  {
    alt: 'bpom',
    src: '/image/home/certificate/bpom.png',
    width: 598,
    height: 683
  },
  {
    alt: 'cdakb',
    src: '/image/home/certificate/cdakb-black.png',
    width: 619,
    height: 300
  },
  {
    alt: 'halal',
    src: '/image/home/certificate/halal.png',
    width: 361,
    height: 646,
  },
  {
    alt: 'lkkp',
    src: '/image/home/certificate/lkkp-black.png',
    width: 619,
    height: 300
  }
]

export const CredibilityHomeSection = () => {
  return (
    <section className='flex gap-8 xl:gap-10 2xl:gap-20'>

      {/* <Image
        src={'/image/group-photo.png'}
        alt='group photo'
        width={347}
        height={381}
        className='object-cover grayscale rounded-2xl aspect-square max-lg:hidden' 
      /> */}

      <div className='flex-2 my-auto flex flex-col gap-6 md:gap-10 xl:gap-10 2xl:gap-15 items-center'>
        <h2 className='h2-format text-center text-balance! xl:text-4xl! 2xl:text-5xl! xl:leading-12! 2xl:leading-16!'>
          Excellence Through {' '}
          <span className='text-brand-red block'>Certified Standards</span>
        </h2>
        <div className="flex max-sm:flex-wrap gap-8 items-center justify-center my-auto">
          {credibleList.map((item, index) => (
            <div
              key={index}
              className="flex-1 flex items-center justify-center h-32 xl:h-36 max-sm:min-w-44 max-sm:max-w-52"
            >
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                data-aos="fade-right"
                data-aos-delay={(200+index*200).toString()}
                className="max-h-full w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}
