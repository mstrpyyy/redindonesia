import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getCategoryTree } from "@/lib/categories";
import { getHomeCarousels } from "@/lib/home-carousels";
import { getPublishedProductPickerOptions } from "@/lib/products";
import { CarouselTable } from "./carousel-table";

export default async function HomeCarouselPage() {
  const [carousels, deviceCategories, productCategories, productOptions] = await Promise.all([
    getHomeCarousels(),
    getCategoryTree("device"),
    getCategoryTree("product"),
    getPublishedProductPickerOptions(),
  ]);

  return (
    <>
      <AdminTitle parent={"Homepage"} title={"Carousel"} />
      <CarouselTable
        carousels={carousels}
        deviceCategories={deviceCategories}
        productCategories={productCategories}
        productOptions={productOptions}
      />
    </>
  );
}
