import Image from "next/image"

interface IIconImage {
  src: string
  alt: string
  width: number
  height: number
}

export const IconImage = ({ src, alt, width, height }: IIconImage) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className='w-52 mb-6' 
    />
  )
}
