import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getSupportPage } from "@/lib/support-pages";
import { SupportPageForm } from "../support-page-form";

export default async function SupportWarrantyServiceAdminPage() {
  const data = await getSupportPage("warranty-service");

  return (
    <>
      <AdminTitle parent={"Support"} title={"Warranty & Service"} />
      <SupportPageForm slug="warranty-service" initialData={data} />
    </>
  );
}
