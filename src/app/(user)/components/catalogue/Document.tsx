import { ArrowDownToLine } from 'lucide-react'
import Image from 'next/image'

interface IDocumentDevice {
  header: string
  subheader?: string
  fileUrl: string
  // Optional — a document highlight can be published without a thumbnail;
  // DocumentDevice falls back to a plain outline button instead of the
  // segment being dropped entirely (see ADR-057).
  thumbnailUrl?: string
  alt: string
}

export const DocumentDevice = ({ header, subheader, fileUrl, thumbnailUrl, alt }: IDocumentDevice) => {
  return (
    <section className='flex max-sm:flex-col items-center justify-evenly gap-10'>
      <h2 className='max-sm:text-center'>
        <span className='p-format leading-2! sm:block'>Download Document</span>
        <span className='h2-format block'>{header}</span>
        {subheader && <span className='p-format block'>{subheader}</span>}
      </h2>

      {thumbnailUrl ? (
        <a
          href={fileUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='
            group relative overflow-hidden
            w-full  max-w-96 aspect-3/4 rounded-xl bg-red-500
            shadow-[0_5px_7px_rgba(0,0,0,0.50)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.40)]
            transition-all duration-200 ease-out
            hover:-translate-y-2
          '
        >
          <div
            className='
              sm:opacity-0 group-hover:opacity-100
              transition-all duration-200 ease-out
              absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-30
              rounded-full h-10 px-4
              flex items-center justify-center
              backdrop-blur-sm
              text-white bg-white/20
            '
          >
            Click to Download
            <ArrowDownToLine size={20} strokeWidth={1.5} className='' />
          </div>
          <Image className='object-cover z-20' src={thumbnailUrl} alt={alt} fill/>
        </a>
      ) : (
        <a
          href={fileUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='
            rounded-full h-16 px-10
            flex items-center justify-center gap-3
            text-lg font-medium
            border-2 border-black text-black
            hover:bg-black hover:text-white
            transition-colors duration-200
          '
        >
          Click to Download
          <ArrowDownToLine size={28} strokeWidth={1.5} />
        </a>
      )}
    </section>
  )
}
