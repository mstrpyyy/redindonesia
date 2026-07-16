import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getSocialAccounts } from "@/lib/social-accounts";
import { SocialAccountTable } from "./social-account-table";

export default async function MarcomPage() {
  const accounts = await getSocialAccounts();

  return (
    <>
      <AdminTitle parent={'Support'} title={'Marcom & Promotion'} />
      <div className="mt-6">
        <SocialAccountTable accounts={accounts} />
      </div>
    </>
  );
}
