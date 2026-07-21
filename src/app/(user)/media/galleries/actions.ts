"use server";

import { prisma } from "@/lib/prisma";

// The public page only ships the first few images per gallery up front (see
// page.tsx); the rest are fetched on demand only once the viewer actually
// needs them (lightbox opened, or navigation runs past what's loaded).
export async function getGalleryImages(id: string): Promise<string[]> {
  const gallery = await prisma.gallery.findUnique({
    where: { id },
    select: { images: true },
  });
  return gallery?.images ?? [];
}
