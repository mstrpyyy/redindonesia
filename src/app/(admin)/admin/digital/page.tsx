import { AdminTitle } from "@/app/(admin)/components/admin-title";
import { getDigitalItems } from "@/lib/digital";
import { DigitalItemTable } from "./digital-item-table";
import { DIGITAL_LIST_PAGE_SIZE, DIGITAL_LIST_PAGE_SIZE_OPTIONS } from "./limits";

interface IPageProps {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}

export default async function DigitalPage({ searchParams }: IPageProps) {
  const params = await searchParams;
  const search = params.q?.trim() ?? "";

  const parsedPageSize = Number(params.pageSize);
  const pageSize: number | "all" =
    params.pageSize === "all"
      ? "all"
      : DIGITAL_LIST_PAGE_SIZE_OPTIONS.includes(parsedPageSize as (typeof DIGITAL_LIST_PAGE_SIZE_OPTIONS)[number])
        ? parsedPageSize
        : DIGITAL_LIST_PAGE_SIZE;

  const parsedPage = Number(params.page);
  const page = pageSize === "all" ? 1 : Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const { items, total } = await getDigitalItems({ search, page, pageSize });

  return (
    <>
      <AdminTitle parent="Digital" title="Digital Catalogue" />
      <div className="mt-6">
        <DigitalItemTable items={items} total={total} page={page} pageSize={pageSize} search={search} />
      </div>
    </>
  );
}
