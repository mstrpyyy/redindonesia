import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedDigitalItemBySlug } from "@/lib/digital";
import { DigitalItemHero } from "./digital-item-hero";

// Standalone, same as the parent `/digital` list page (see ADR-109/ADR-110)
// — no `(user)` Navbar/Footer, since this is reached by scanning/clicking a
// QR code, not by browsing the site.
interface IPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: IPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedDigitalItemBySlug(slug);
  if (!item) return { title: "Digital Content" };

  return { title: `${item.name} | PT. Radian Elok Distriversa` };
}

export default async function DigitalItemPage({ params }: IPageProps) {
  const { slug } = await params;
  const item = await getPublishedDigitalItemBySlug(slug);
  if (!item) notFound();

  return <DigitalItemHero item={item} />;
}
