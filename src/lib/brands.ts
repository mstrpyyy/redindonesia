import { prisma } from "@/lib/prisma";
import { ICategoryUrlSuggestion } from "@/interfaces/general";
import { getCategoryUrlSuggestions } from "@/lib/categories";
import { getPublishedProductPickerOptions } from "@/lib/products";

export function getBrands() {
  return prisma.brand.findMany({
    orderBy: { order: "asc" },
  });
}

// URL suggestions offered on the Brand admin form — every device/product
// Category page (see `getCategoryUrlSuggestions`) plus every published
// device/product's own page, so a brand can link straight to a specific
// product instead of only its category.
export async function getBrandUrlSuggestions(): Promise<ICategoryUrlSuggestion[]> {
  const [categorySuggestions, productOptions] = await Promise.all([
    getCategoryUrlSuggestions(),
    getPublishedProductPickerOptions(),
  ]);

  const productSuggestions: ICategoryUrlSuggestion[] = productOptions.map((option) => ({
    label: `${option.type === "device" ? "Devices" : "Products"} > ${option.name}`,
    url: option.url,
  }));

  return [...categorySuggestions, ...productSuggestions];
}
