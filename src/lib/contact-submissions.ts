import { prisma } from "@/lib/prisma";

export interface IContactSubmission {
  id: string;
  name: string;
  phone: string;
  email: string;
  question: string;
  isRead: boolean;
  createdAt: Date;
}

// Newest first, same as src/lib/articles.ts's own listing order — the most
// recent submission is what an admin checking in wants to see.
export async function getContactSubmissions(): Promise<IContactSubmission[]> {
  return prisma.contactSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });
}
