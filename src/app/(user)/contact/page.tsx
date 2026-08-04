import { PageBanner } from '@/app/(user)/components/PageBanner'
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
        alt='RED (Radian Elok Distriversa) Contact Us'
      >
          <span className='text-brand-red2'>Contact</span>
          {" "}
          <span className='text-white'>Us</span>
      </PageBanner>

      {bodyHtml && (
        <BodyWrapper className='py-20'>
          <div className='tiptap-content' dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </BodyWrapper>
      )}

      <BodyWrapper className='py-20'>
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