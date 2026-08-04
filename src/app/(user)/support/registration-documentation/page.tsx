import { PageBanner } from '@/app/(user)/components/PageBanner'
import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { TrustSection } from '@/app/(user)/components/TrustLists'
import { getSupportPage } from '@/lib/support-pages'
import { hasRichTextContent } from '@/lib/utils'

export default async function SupportRegistrationDocumentation() {
  const page = await getSupportPage('registration-documentation')
  const bodyHtml = page.body && hasRichTextContent(page.body) ? page.body : null

  return (
    <main>

      <PageBanner
        defImage={page.bannerXlUrl ?? '/image/support/registration/dummy2.jpg'}
        mdImage={page.bannerMdUrl ?? undefined}
        smImage={page.bannerSmUrl ?? undefined}
        alt='RED (Radian Elok Distriversa) Registration & Documentation Support'
      >
        <div className='flex flex-col items-center'>
          <span className='text-brand-red2'>Registration</span>
          <span className='text-white'>& Documentation</span>
        </div>
      </PageBanner>

      {bodyHtml && (
        <BodyWrapper className='py-20'>
          <div className='tiptap-content' dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </BodyWrapper>
      )}

      <BodyWrapper className='pb-20'>
        <TrustSection />
      </BodyWrapper>
    </main>
  )
}