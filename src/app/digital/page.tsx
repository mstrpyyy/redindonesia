import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { House } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublishedDigitalItems } from "@/lib/digital";
import { DigitalQrCarousel } from "./digital-qr-carousel";

// Standalone — deliberately outside the `(user)` route group, so it gets only
// the root layout (font, globals) and none of the site Navbar/Footer, same
// precedent as `src/app/not-found.tsx`. This page is meant to be landed on
// directly from a scanned/printed QR code, not browsed to from the site nav —
// see ADR-109. Needs its own full `title` (no `(user)` title template here).
export const metadata: Metadata = {
  title: "Digital Content | PT. Radian Elok Distriversa",
  description: "Scan a QR code to access this product's digital media.",
};

export default async function DigitalPage() {
  const items = await getPublishedDigitalItems();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-black px-6 py-16 text-center text-white md:gap-14">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/image/logo-red-white.png"
          alt="PT. Radian Elok Distriversa"
          width={362}
          height={91}
          className="h-auto w-48 sm:w-64"
          priority
        />
        <h1 className="h1-format">Digital Content</h1>
      </div>

      {items.length > 0 ? (
        <DigitalQrCarousel items={items} />
      ) : (
        <p className="text-white/70">No digital content available yet.</p>
      )}

      <Button asChild variant="glass" size="lg" className="rounded-full">
        <Link href="/">
          <House className="size-5" />
          Home Page
        </Link>
      </Button>
    </main>
  );
}
