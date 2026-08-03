import { prisma } from "@/lib/prisma";
import { getCategoryAncestry } from "@/lib/categories";
import { getPublishedProductCards } from "@/lib/products";
import { ICarouselItem, IHomeCarouselListItem, IPublicHomeCarousel } from "@/interfaces/general";

function parseItems(value: unknown): ICarouselItem[] {
  return Array.isArray(value) ? (value as ICarouselItem[]) : [];
}

// Admin list — raw stored fields plus a resolved breadcrumb label for
// "category" mode rows, so the table can show which category a carousel is
// tied to (or flag it as missing, see the HomeCarousel model comment)
// without a per-row extra round trip from the client.
export async function getHomeCarousels(): Promise<IHomeCarouselListItem[]> {
  const rows = await prisma.homeCarousel.findMany({ orderBy: { order: "asc" } });

  return Promise.all(
    rows.map(async (row) => {
      const ancestry = row.categoryId ? await getCategoryAncestry(row.categoryId) : null;
      return {
        id: row.id,
        mode: row.mode as "category" | "custom",
        order: row.order,
        size: row.size as "sm" | "md",
        showSeeMore: row.showSeeMore,
        categoryId: row.categoryId,
        title: row.title,
        seeMoreUrl: row.seeMoreUrl,
        items: parseItems(row.items),
        titleDisplayMode: row.titleDisplayMode as "text" | "image",
        titleImage: row.titleImage,
        categoryLabel: ancestry ? ancestry.names.join(" > ") : null,
      };
    })
  );
}

// Public homepage — fully resolves "category" mode rows (title, product
// list, "See More" URL) live from the linked category, rather than reading
// back a snapshot, so a carousel always reflects the category's current
// name/slug path and published products (see ADR-066). A "category" row
// whose category was deleted, or whose category currently has zero
// published products, is dropped entirely — an empty carousel has nothing
// to render.
export async function getPublicHomeCarousels(): Promise<IPublicHomeCarousel[]> {
  const rows = await prisma.homeCarousel.findMany({ orderBy: { order: "asc" } });

  const resolved = await Promise.all(
    rows.map(async (row): Promise<IPublicHomeCarousel | null> => {
      const size = row.size as "sm" | "md";
      // Only meaningful when actually set to "image" — a stored `titleImage`
      // left over from a previous toggle is ignored while in "text" mode.
      const titleImage = row.titleDisplayMode === "image" ? row.titleImage : null;

      if (row.mode === "custom") {
        const items = parseItems(row.items);
        if (!row.title || items.length === 0) return null;
        return {
          id: row.id,
          title: row.title,
          titleImage,
          size,
          seeMoreUrl: row.showSeeMore ? (row.seeMoreUrl ?? null) : null,
          items,
        };
      }

      if (!row.categoryId) return null;
      const ancestry = await getCategoryAncestry(row.categoryId);
      if (!ancestry) return null;

      const urlPrefix = `/${ancestry.type === "device" ? "devices" : "products"}/${ancestry.slugPath.join("/")}`;
      const cards = await getPublishedProductCards(row.categoryId, urlPrefix);
      if (cards.length === 0) return null;

      return {
        id: row.id,
        title: ancestry.names[ancestry.names.length - 1],
        titleImage,
        size,
        seeMoreUrl: row.showSeeMore ? urlPrefix : null,
        items: cards.map((card, index) => ({
          id: `${row.id}-${index}`,
          title: card.name,
          img: card.imgUrl,
          href: card.url,
        })),
      };
    })
  );

  return resolved.filter((carousel): carousel is IPublicHomeCarousel => carousel !== null);
}
