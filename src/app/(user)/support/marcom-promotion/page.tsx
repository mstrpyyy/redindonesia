import Image from 'next/image'
import { Globe } from 'lucide-react'
import {
  FacebookOutlinedRounded,
  InstagramOutlinedRounded,
  TiktokOutlinedRounded,
  XOutlinedRounded,
  YoutubeOutlinedRounded,
} from '@lineiconshq/react-lineicons'
import { PageBanner } from '@/app/(user)/components/PageBanner'
import { CertificationList } from '@/app/(user)/components/TrustLists'
import { getSocialAccounts } from '@/lib/social-accounts'
import { getSupportPage } from '@/lib/support-pages'
import { hasRichTextContent } from '@/lib/utils'
import { BodyWrapper } from '../../components/BodyWrapper'

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook: <FacebookOutlinedRounded className='size-5 shrink-0 text-brand-red2' />,
  instagram: <InstagramOutlinedRounded className='size-5 shrink-0 text-brand-red2' />,
  tiktok: <TiktokOutlinedRounded className='size-5 shrink-0 text-brand-red2' />,
  twitter: <XOutlinedRounded className='size-5 shrink-0 text-brand-red2' />,
  youtube: <YoutubeOutlinedRounded className='size-5 shrink-0 text-brand-red2' />,
}

export default async function SupportMarcomPromotion() {
  const [accounts, page] = await Promise.all([
    getSocialAccounts(),
    getSupportPage('marcom'),
  ])
  const bodyHtml = page.body && hasRichTextContent(page.body) ? page.body : null

  return (
    <main>
      <PageBanner
        defImage={page.bannerXlUrl ?? '/image/support/marcom/dummy.jpg'}
        mdImage={page.bannerMdUrl ?? undefined}
        smImage={page.bannerSmUrl ?? undefined}
        alt='RED (Radian Elok Distriversa) Registration & Documentation Support'
      >
          <span className='text-brand-red2'>Marcom</span>
          {" "}
          <span className='text-white'>& Promotion</span>
      </PageBanner>

      {bodyHtml && (
        <BodyWrapper className='py-20'>
          <div className='tiptap-content' dangerouslySetInnerHTML={{ __html: bodyHtml }} />
        </BodyWrapper>
      )}

      <BodyWrapper className='pb-20'>
        <CertificationList />
      </BodyWrapper>

      <BodyWrapper className="py-20 radial-gradient3">
        <h2 className='h2-format text-center'>
          Our
          {" "}
          <span className='text-brand-red'>
            Social Media
          </span>
        </h2>

        <div className='mt-10 flex flex-wrap justify-center gap-10'>
          {accounts.map((account) => (
            <a
              key={account.id}
              href={account.url}
              target='_blank'
              rel='noopener noreferrer'
              className='flex flex-col items-center justify-center gap-6 bg-white/70 shadow-sm hover:shadow-md transition-shadow duration-150 rounded-xl w-60 aspect-square group'
            >
              <div className='relative size-32 overflow-hidden rounded-full bg-muted border'>
                <Image
                  src={account.profileImg}
                  alt={account.label}
                  fill
                  sizes='128px'
                  className='object-cover'
                />
              </div>
              <span className='flex items-center gap-1 text-center font-medium text-sm group-hover:underline'>
                {PLATFORM_ICONS[account.platform] ?? (
                  <Globe className='size-5 shrink-0' />
                )}
                {account.label}
              </span>
              <span className='sr-only'>
                {account.platform}
              </span>
            </a>
          ))}
        </div>
      </BodyWrapper>
    </main>
  )
}