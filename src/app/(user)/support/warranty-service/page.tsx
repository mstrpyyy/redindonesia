
import { PageBanner } from '@/app/(user)/components/PageBanner'
import { RevealText } from '@/app/(user)/components/RevealText'
import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { TrustSection } from '@/app/(user)/components/TrustLists'
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
        defVideo={page.bannerXlVideoUrl}
        mdVideo={page.bannerMdVideoUrl}
        smVideo={page.bannerSmVideoUrl}
        videoUseForSmaller={page.bannerVideoUseForSmaller}
        alt='RED (Radian Elok Distriversa) Warranty & Service Support'
      >
        <RevealText
          words={[
            { text: 'Warranty', className: 'text-brand-red2' },
            { text: '&', className: 'text-white' },
            { text: 'Service', className: 'text-white' },
          ]}
        />
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