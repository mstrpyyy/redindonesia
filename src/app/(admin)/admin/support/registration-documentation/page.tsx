import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getSupportPage } from "@/lib/support-pages";
import { SupportPageForm } from "../support-page-form";

export default async function SupportRegistrationDocumentationAdminPage() {
  const data = await getSupportPage("registration-documentation");

  return (
    <>
      <AdminTitle parent={"Support"} title={"Registration & Documentation"} />
      <SupportPageForm slug="registration-documentation" initialData={data} />
    </>
  );
}
