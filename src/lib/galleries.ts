import { prisma } from "@/lib/prisma";

export function getGalleries() {
  return prisma.gallery.findMany({
    orderBy: { order: "asc" },
  });
}
