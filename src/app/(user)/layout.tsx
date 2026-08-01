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
  // A transient DB hiccup here must not break every page's navbar (it renders
  // on all of them) — fall back to an empty tree per branch, which reads as
  // `hasCategories: false` below and makes `buildNavMenus` use that branch's
  // static data instead. A non-empty but not-yet-a-page tree (ADR-044) is a
  // different case — `hasCategories: true` with a `menu` that may still be
  // `[]` after ADR-043's filtering — and correctly does NOT fall back.
  const [deviceCategories, productCategories] = await Promise.all([
    getPublicDeviceCategoryTree().catch(() => []),
    getPublicProductCategoryTree().catch(() => []),
  ]);
  const menus = buildNavMenus(
    { hasCategories: deviceCategories.length > 0, menu: mapCategoriesToNavMenu(deviceCategories) },
    { hasCategories: productCategories.length > 0, menu: mapCategoriesToNavMenu(productCategories) }
  );

  return (
    <>
      <Navbar menus={menus} />
      {children}
      <Footer />
    </>
  );
}

