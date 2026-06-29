import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "./components/navbar/Navbar";
import localFont from 'next/font/local'
import AOSProvider from "@/providers/AosProvider";
import { Footer } from "./components/Footer";

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



export const metadata: Metadata = {
  title: {
    template: '%s | PT. Radian Elok Distriversa',
    default: 'PT. Radian Elok Distriversa', // a default is required when creating a template
  },
  description: "Established in 2004, PT. Radian Elok Distriversa has many years of experience and a broad network in the field of trading and distribution for medical aesthetic devices, medical laser devices, and cosmoceutical products. Headquartered in Jakarta, Indonesia, we work with many of the world's leading companies in Europe and USA. Our clients include leading local plastic surgeons, dermatologists, and aesthetic general practitioners.",
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
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
