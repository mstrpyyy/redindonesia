import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getCategoryTree } from "@/lib/categories";
import { getHomeCarousels } from "@/lib/home-carousels";
import { getHomePage } from "@/lib/home-page";
import { getPublishedProductPickerOptions } from "@/lib/products";
import { CarouselTable } from "./carousel-table";
import { HomePageForm } from "./home-page-form";

export default async function HomeCarouselPage() {
  const [carousels, deviceCategories, productCategories, productOptions, homePage] = await Promise.all([
    getHomeCarousels(),
    getCategoryTree("device"),
    getCategoryTree("product"),
    getPublishedProductPickerOptions(),
    getHomePage("home"),
  ]);

  return (
    <>
      <AdminTitle parent={"Homepage"} title={"Content"} />
      <HomePageForm slug="home" initialData={homePage} />
      <hr className="my-6 border-t" />
      <CarouselTable
        carousels={carousels}
        deviceCategories={deviceCategories}
        productCategories={productCategories}
        productOptions={productOptions}
      />
    </>
  );
}
