import { prisma } from "@/lib/prisma";

export function getSocialAccounts() {
  return prisma.socialAccount.findMany({
    orderBy: { order: "asc" },
  });
}
