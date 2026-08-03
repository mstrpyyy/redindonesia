import { PageBanner } from '@/app/(user)/components/PageBanner'
import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { getSupportPage } from '@/lib/support-pages'
import { hasRichTextContent } from '@/lib/utils'

export default async function SupportCareer() {
  const page = await getSupportPage('career')
  const bodyHtml = page.body && hasRichTextContent(page.body) ? page.body : null

  return (
    <main>
      <PageBanner
        defImage={page.bannerXlUrl ?? '/image/support/career/dummy2.jpg'}
        mdImage={page.bannerMdUrl ?? undefined}
        smImage={page.bannerSmUrl ?? undefined}
        alt='RED (Radian Elok Distriversa) Career'
      >
          <span className='text-brand-red2'>RED</span>
          {" "}
          <span className='text-white'>Career</span>
      </PageBanner>

      {bodyHtml && (
        <BodyWrapper className='py-20'>
          <div className='tiptap-content' dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </BodyWrapper>
      )}
    </main>
  )
}