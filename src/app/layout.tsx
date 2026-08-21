import type { Metadata } from "next";
import "./globals.css";
import localFont from 'next/font/local'
import AOSProvider from "@/providers/AosProvider";
import { SITE_URL } from "@/lib/site";

const jakarta = localFont({
  src: [
    {
      path: '../../public/fonts/PlusJakartaSans-ExtraLight.ttf',
      weight: '200',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-ExtraBold.ttf',
      weight: '900',
      style: 'normal',
    },
  ]
})

// `metadataBase` resolves every relative URL used in per-page `openGraph`/
// `twitter`/`alternates` metadata (image paths, canonical/og:url) into an
// absolute one — required for link-preview crawlers (WhatsApp, Facebook,
// etc.), which won't fetch a relative path. `openGraph`/`twitter` here are
// site-wide defaults that pages inherit unless they set their own.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: {
    siteName: "PT. Radian Elok Distriversa",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jakarta.className} antialiased`}
      >
        <AOSProvider />
        {children}
      </body>
    </html>
  );
}
