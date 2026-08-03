import { prisma } from "@/lib/prisma";

export function getPodcasts() {
  return prisma.podcast.findMany({
    orderBy: { order: "asc" },
  });
}
