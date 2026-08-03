import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getContactSubmissions } from "@/lib/contact-submissions";
import { FormResponseView } from "./form-response-view";

export default async function ContactFormResponseAdminPage() {
  const submissions = await getContactSubmissions();

  return (
    <>
      <AdminTitle parent={"Contact"} title={"Form Response"} />
      <FormResponseView submissions={submissions} />
    </>
  );
}
