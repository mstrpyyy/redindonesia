import { prisma } from "@/lib/prisma";
import { getCategoryAncestry } from "@/lib/categories";
import { getContactPage } from "@/lib/contact-pages";
import { getSupportPage, SUPPORT_PAGE_PUBLIC_PATH, SUPPORT_PAGE_SLUGS, type SupportPageSlug } from "@/lib/support-pages";
import { IProductPickerOption, ISearchPageResult, ISearchSuggestions } from "@/interfaces/general";

// Product/device suggestions match on `name` alone, so a short query is
// already precise — page suggestions pull in whole-body text across five
// content sources (categories, articles, support/contact pages, media index
// pages) and need a longer query to avoid a flood of noisy body-text matches
// on a couple of letters.
export const MIN_PRODUCT_SEARCH_QUERY_LENGTH = 3;
export const MIN_PAGE_SEARCH_QUERY_LENGTH = 5;

const MAX_RESULTS_PER_GROUP = 3;

const SUPPORT_PAGE_LABELS: Record<SupportPageSlug, string> = {
  "registration-documentation": "Registration & Documentation",
  "warranty-service": "Warranty & Service",
  career: "Career",
  marcom: "Marcom & Promotion",
};

// Articles/Galleries/Podcasts each have their own admin-managed banner
// (ArticlesPage/GalleriesPage/PodcastPage) but no free-text body of their
// own to search — only the index page itself is a "page" here.
const MEDIA_INDEX_PAGES = [
  { label: "Articles", url: "/media/articles" },
  { label: "Galleries", url: "/media/galleries" },
  { label: "Podcasts", url: "/media/podcasts" },
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ");
}

async function searchProductSuggestions(query: string): Promise<IProductPickerOption[]> {
  const rows = await prisma.product.findMany({
    where: { status: "public", name: { contains: query, mode: "insensitive" } },
    orderBy: { name: "asc" },
    take: MAX_RESULTS_PER_GROUP,
    select: { id: true, type: true, name: true, thumbnail: true, slug: true, categoryId: true },
  });

  const resolved = await Promise.all(
    rows.map(async (row): Promise<IProductPickerOption | null> => {
      const ancestry = await getCategoryAncestry(row.categoryId);
      if (!ancestry) return null;

      const urlPrefix = `/${row.type === "device" ? "devices" : "products"}/${ancestry.slugPath.join("/")}`;
      return {
        id: row.id,
        type: row.type as "device" | "product",
        name: row.name,
        thumbnail: row.thumbnail,
        url: `${urlPrefix}/${row.slug}`,
      };
    })
  );

  return resolved.filter((option): option is IProductPickerOption => option !== null);
}

async function searchCategoryPages(query: string): Promise<ISearchPageResult[]> {
  const rows = await prisma.category.findMany({
    where: {
      isPage: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { body: { contains: query, mode: "insensitive" } },
      ],
    },
    take: MAX_RESULTS_PER_GROUP,
    select: { id: true, type: true, name: true, title: true },
  });

  const resolved = await Promise.all(
    rows.map(async (row): Promise<ISearchPageResult | null> => {
      const ancestry = await getCategoryAncestry(row.id);
      if (!ancestry) return null;

      const urlBase = row.type === "device" ? "/devices" : "/products";
      return {
        id: row.id,
        label: row.title ?? row.name,
        url: `${urlBase}/${ancestry.slugPath.join("/")}`,
        kind: "category",
        image: null,
      };
    })
  );

  return resolved.filter((result): result is ISearchPageResult => result !== null);
}

async function searchArticlePages(query: string): Promise<ISearchPageResult[]> {
  const rows = await prisma.article.findMany({
    where: {
      status: "published",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { excerpt: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: MAX_RESULTS_PER_GROUP,
    select: { id: true, title: true, slug: true, coverImage: true },
  });

  return rows.map((row) => ({
    id: row.id,
    label: row.title,
    url: `/media/articles/${row.slug}`,
    kind: "article",
    image: row.coverImage,
  }));
}

// Support/Contact page bodies and the three Media index pages have no list
// or search index of their own — a handful of fixed, upsert-by-slug rows
// (see support-pages.ts/contact-pages.ts) — cheap enough to fetch in full
// and match in memory rather than building a dedicated query per one-row
// model.
async function searchStaticPages(query: string): Promise<ISearchPageResult[]> {
  const [supportPages, contactPage] = await Promise.all([
    Promise.all(SUPPORT_PAGE_SLUGS.map((slug) => getSupportPage(slug))),
    getContactPage("content"),
  ]);

  const candidates: (ISearchPageResult & { searchText: string })[] = [
    ...supportPages.map((page) => ({
      id: `support-${page.slug}`,
      label: SUPPORT_PAGE_LABELS[page.slug],
      url: `/support/${SUPPORT_PAGE_PUBLIC_PATH[page.slug]}`,
      kind: "support" as const,
      image: null,
      searchText: `${SUPPORT_PAGE_LABELS[page.slug]} ${stripHtml(page.body ?? "")}`.toLowerCase(),
    })),
    {
      id: "contact-content",
      label: "Contact Us",
      url: "/contact",
      kind: "contact",
      image: null,
      searchText: `Contact Us ${stripHtml(contactPage.body ?? "")}`.toLowerCase(),
    },
    ...MEDIA_INDEX_PAGES.map((page) => ({
      id: `media-${page.url}`,
      label: page.label,
      url: page.url,
      kind: "media" as const,
      image: null,
      searchText: page.label.toLowerCase(),
    })),
  ];

  return candidates
    .filter((candidate) => candidate.searchText.includes(query))
    .map(({ searchText: _searchText, ...result }) => result);
}

async function searchPageSuggestions(query: string): Promise<ISearchPageResult[]> {
  const [categoryPages, articlePages, staticPages] = await Promise.all([
    searchCategoryPages(query),
    searchArticlePages(query),
    searchStaticPages(query),
  ]);

  // A match in the label itself (title/page name) surfaces before a match
  // that only hit inside body text — a body-only hit is a weaker signal the
  // page is actually what the visitor is looking for.
  const all = [...categoryPages, ...articlePages, ...staticPages];
  const labelMatches = all.filter((page) => page.label.toLowerCase().includes(query));
  const bodyOnlyMatches = all.filter((page) => !page.label.toLowerCase().includes(query));

  return [...labelMatches, ...bodyOnlyMatches].slice(0, MAX_RESULTS_PER_GROUP);
}

// Powers the navbar search dropdown (see SearchBar.tsx). `pages` is gated
// separately from — and to a higher minimum length than — `products` (see
// the constants above), so typing e.g. "alma" can already suggest products
// while page suggestions stay empty until the query is long enough to be a
// meaningful body-text match.
export async function getSearchSuggestions(rawQuery: string): Promise<ISearchSuggestions> {
  const query = rawQuery.trim().toLowerCase();

  const [products, pages] = await Promise.all([
    query.length >= MIN_PRODUCT_SEARCH_QUERY_LENGTH ? searchProductSuggestions(query) : Promise.resolve([]),
    query.length >= MIN_PAGE_SEARCH_QUERY_LENGTH ? searchPageSuggestions(query) : Promise.resolve([]),
  ]);

  return { products, pages };
}
