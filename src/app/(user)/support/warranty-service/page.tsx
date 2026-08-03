
import { PageBanner } from '@/app/(user)/components/PageBanner'
import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { getSupportPage } from '@/lib/support-pages'
import { hasRichTextContent } from '@/lib/utils'

export default async function SupportWarrantyService() {
  const page = await getSupportPage('warranty-service')
  const bodyHtml = page.body && hasRichTextContent(page.body) ? page.body : null

  return (
    <main>
      <PageBanner
        defImage={page.bannerXlUrl ?? '/image/support/warranty/dummy.jpg'}
        mdImage={page.bannerMdUrl ?? undefined}
        smImage={page.bannerSmUrl ?? undefined}
        alt='RED (Radian Elok Distriversa) Warranty & Service Support'
      >
        <span className='text-brand-red2'>Warranty</span>
        {" "}
        <span className='text-white'>& Service</span>
      </PageBanner>

      {bodyHtml && (
        <BodyWrapper className='py-20'>
          <div className='tiptap-content' dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </BodyWrapper>
      )}
    </main>
  )
}