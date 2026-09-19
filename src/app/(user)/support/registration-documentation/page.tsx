import type { Metadata } from 'next'
import { PageBanner } from '@/app/(user)/components/PageBanner'
import { RevealText } from '@/app/(user)/components/RevealText'
import { BodyWrapper } from '@/app/(user)/components/BodyWrapper'
import { TrustSection } from '@/app/(user)/components/TrustLists'
import { getSupportPage } from '@/lib/support-pages'
import { hasRichTextContent } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Registration & Documentation',
  description:
    'Product registration and documentation support for medical aesthetic and laser devices distributed by PT. Radian Elok Distriversa.',
}

export default async function SupportRegistrationDocumentation() {
  const page = await getSupportPage('registration-documentation')
  const bodyHtml = page.body && hasRichTextContent(page.body) ? page.body : null

  return (
    <main>

      <PageBanner
        defImage={page.bannerXlUrl ?? '/image/support/registration/dummy2.jpg'}
        mdImage={page.bannerMdUrl ?? undefined}
        smImage={page.bannerSmUrl ?? undefined}
        defVideo={page.bannerXlVideoUrl}
        mdVideo={page.bannerMdVideoUrl}
        smVideo={page.bannerSmVideoUrl}
        videoUseForSmaller={page.bannerVideoUseForSmaller}
        alt='RED (Radian Elok Distriversa) Registration & Documentation Support'
      >
        <RevealText
          words={[
            { text: 'Registration', className: 'text-brand-red2' },
            { text: '&', className: 'text-white' },
            { text: 'Documentation', className: 'text-white' },
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