import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getContactPage } from "@/lib/contact-pages";
import { ContactPageForm } from "../contact-page-form";

export default async function ContactContentAdminPage() {
  const data = await getContactPage("content");

  return (
    <>
      <AdminTitle parent={"Contact"} title={"Content"} />
      <ContactPageForm slug="content" initialData={data} />
    </>
  );
}
