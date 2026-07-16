import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

export interface IBeforeAfter {
  title: string
  imageUrl: string
  alt: string
}

interface IBeforeAfterImage {
  beforeImage: IBeforeAfter
  afterImage: IBeforeAfter
  className?: string
}



export const BeforeAfterImage = ({beforeImage, afterImage, className}:IBeforeAfterImage) => {
  return (
    <ReactCompareSlider
      className={className ?? ''}
      itemOne={<ReactCompareSliderImage src={beforeImage.imageUrl} alt={beforeImage.alt} />}
      itemTwo={<ReactCompareSliderImage src={afterImage.imageUrl} alt={afterImage.alt} />}
    />
  )
}
