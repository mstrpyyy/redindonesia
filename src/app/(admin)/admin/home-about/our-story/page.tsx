import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getAboutPage } from "@/lib/about-page";
import { OurStoryForm } from "./our-story-form";

export default async function OurStoryPage() {
  const aboutPage = await getAboutPage("our-story");

  return (
    <>
      <AdminTitle parent={"Home & About"} title={"Our Story"} />
      <OurStoryForm slug="our-story" initialData={aboutPage} />
    </>
  );
}
