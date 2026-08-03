import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getSupportPage } from "@/lib/support-pages";
import { SupportPageForm } from "../support-page-form";

export default async function SupportCareerAdminPage() {
  const data = await getSupportPage("career");

  return (
    <>
      <AdminTitle parent={"Support"} title={"Career"} />
      <SupportPageForm slug="career" initialData={data} />
    </>
  );
}
