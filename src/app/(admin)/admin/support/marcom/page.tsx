import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { prisma } from "@/lib/prisma";
import { SocialAccountTable } from "./social-account-table";

export default async function MarcomPage() {
  const accounts = await prisma.socialAccount.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <>
      <AdminTitle parent={'Support'} title={'Marcom & Promotion'} />
      <div className="mt-6">
        <SocialAccountTable accounts={accounts} />
      </div>
    </>
  );
}
