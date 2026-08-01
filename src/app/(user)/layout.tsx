import type { Metadata } from "next";
import { Navbar } from "./components/navbar/Navbar";
import { Footer } from "./components/Footer";
import { buildNavMenus } from "@/lib/data";
import {
  getPublicDeviceCategoryTree,
  getPublicProductCategoryTree,
  mapCategoriesToNavMenu,
} from "@/lib/categories";





export const metadata: Metadata = {
  title: {
    template: '%s | PT. Radian Elok Distriversa',
    default: 'PT. Radian Elok Distriversa', // a default is required when creating a template
  },
  description: "Established in 2004, PT. Radian Elok Distriversa has many years of experience and a broad network in the field of trading and distribution for medical aesthetic devices, medical laser devices, and cosmoceutical products. Headquartered in Jakarta, Indonesia, we work with many of the world's leading companies in Europe and USA. Our clients include leading local plastic surgeons, dermatologists, and aesthetic general practitioners.",
};

export default async function userLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `null` (the read itself threw) is tracked separately from `[]` (the read
  // succeeded, there's just nothing there yet) — only the former falls back
  // to the static placeholder (ADR-050). A transient DB hiccup here must not
  // break every page's navbar (it renders on all of them), but an empty CMS
  // now shows an empty branch instead of fake static content.
  const [deviceCategories, productCategories] = await Promise.all([
    getPublicDeviceCategoryTree().catch(() => null),
    getPublicProductCategoryTree().catch(() => null),
  ]);
  const menus = buildNavMenus(
    { fetchSucceeded: deviceCategories !== null, menu: mapCategoriesToNavMenu(deviceCategories ?? []) },
    { fetchSucceeded: productCategories !== null, menu: mapCategoriesToNavMenu(productCategories ?? []) }
  );

  return (
    <>
      <Navbar menus={menus} />
      {children}
      <Footer />
    </>
  );
}

