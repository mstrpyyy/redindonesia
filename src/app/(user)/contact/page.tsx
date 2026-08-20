import { PageBanner } from '@/app/(user)/components/PageBanner'
import { RevealText } from '@/app/(user)/components/RevealText'
import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { TrustSection } from '@/app/(user)/components/TrustLists'
import { ContactForm } from './contact-form'
import { getContactPage } from '@/lib/contact-pages'
import { hasRichTextContent } from '@/lib/utils'

export default async function Contact() {
  const page = await getContactPage('content')
  const bodyHtml = page.body && hasRichTextContent(page.body) ? page.body : null

  return (
    <main>
      <PageBanner
        defImage={page.bannerXlUrl ?? '/image/contact/dummy2.jpg'}
        mdImage={page.bannerMdUrl ?? undefined}
        smImage={page.bannerSmUrl ?? undefined}
        defVideo={page.bannerXlVideoUrl}
        mdVideo={page.bannerMdVideoUrl}
        smVideo={page.bannerSmVideoUrl}
        videoUseForSmaller={page.bannerVideoUseForSmaller}
        alt='RED (Radian Elok Distriversa) Contact Us'
      >
          <RevealText
            words={[
              { text: 'Contact', className: 'text-brand-red2' },
              { text: 'Us', className: 'text-white' },
            ]}
          />
      </PageBanner>

      <BodyWrapper className='my-10 md:my-20'>
        <div className='w-full aspect-3/2 md:aspect-video lg:aspect-3/1 overflow-hidden rounded-lg'>
          <iframe
            src='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.83203159042!2d106.90502837603692!3d-6.1532452603146455!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f54432d9c011%3A0xbae52612408387b5!2sRadian%20Elok%20Distriversa%2C%20PT.!5e0!3m2!1sen!2sid!4v1770731343650!5m2!1sen!2sid'
            width='100%'
            height='100%'
            allowFullScreen
            loading='lazy'
            referrerPolicy='no-referrer-when-downgrade'
            title='Radian Elok Distriversa location'
          />
        </div>
      </BodyWrapper>


      {bodyHtml && (
        <BodyWrapper className='my-10 md:my-20'>
          <div className='tiptap-content' dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </BodyWrapper>
      )}

      <BodyWrapper className='my-10 md:my-20'>
        <div className='mx-auto flex max-w-2xl flex-col items-center text-center'>
          <p className='text-brand-red2 text-sm font-semibold tracking-wide uppercase'>Need Something?</p>
          <h2 className='h2-format mt-2'>Please fill our contact form</h2>
          <p className='text-muted-foreground mt-4 text-base lg:text-lg'>we will get back to you ASAP</p>
        </div>

        <div className='mx-auto mt-10 w-full max-w-2xl'>
          <ContactForm />
        </div>
      </BodyWrapper>

      <BodyWrapper className='pb-20'>
        <TrustSection />
      </BodyWrapper>
    </main>
  )
}