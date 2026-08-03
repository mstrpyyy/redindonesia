import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getSocialAccounts } from "@/lib/social-accounts";
import { getSupportPage } from "@/lib/support-pages";
import { SupportPageForm } from "../support-page-form";
import { SocialAccountTable } from "./social-account-table";

export default async function MarcomPage() {
  const [accounts, page] = await Promise.all([
    getSocialAccounts(),
    getSupportPage("marcom"),
  ]);

  return (
    <>
      <AdminTitle parent={'Support'} title={'Marcom & Promotion'} />
      <div className="flex flex-col gap-8">
        <SupportPageForm slug="marcom" initialData={page} />
        <hr className="border-t" />
        <SocialAccountTable accounts={accounts} />
      </div>
    </>
  );
}
