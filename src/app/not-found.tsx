import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center px-7 text-center'>
      <Image
        src='/image/logo-red-black.png'
        alt='PT. Radian Elok Distriversa'
        width={200}
        height={60}
        className='mb-10 h-auto w-40 sm:w-48'
        priority
      />

      <p className='text-brand-red2 text-7xl font-bold sm:text-8xl xl:text-9xl'>404</p>
      <h1 className='h2-format mt-4'>Page not found</h1>
      <p className='text-muted-foreground mt-4 max-w-md text-base lg:text-lg'>
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>

      <Button asChild size='lg' className='mt-10'>
        <Link href='/'>Return to Home</Link>
      </Button>
    </main>
  )
}
