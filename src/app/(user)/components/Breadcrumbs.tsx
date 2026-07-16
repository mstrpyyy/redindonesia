'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react/jsx-runtime';

export const Breadcrumbs = () => {
  const pathname = usePathname();

  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);

  const formatSegment = (segment: string) => {
    return segment
      .replaceAll('-', ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <nav className="text-neutral-300 text-xxs sm:text-xs max-sm:flex-wrap flex items-center">
      <Link href="/" className="relative group">
        <Home className='size-4' />
        <div className='w-full border-b border-b-white absolute -bottom-0 hidden group-hover:block' />
      </Link>

      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');

        return (
          <Fragment key={href}>
            <ChevronRight className='inline size-4' />
            <Link href={href} className="hover:underline text-nowrap text-shadow">
              {formatSegment(segment)}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
};
