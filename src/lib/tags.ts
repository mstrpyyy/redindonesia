import { prisma } from "@/lib/prisma";
import { ITag } from "@/interfaces/general";

// The full reusable pool for one type — fetched once per editor page load
// and handed to the product form as the searchable/creatable catalog behind
// its tag picker (see ADR-041). Small enough per type to not need pagination.
export async function getTags(type: "device" | "product"): Promise<ITag[]> {
  const rows = await prisma.tag.findMany({
    where: { type },
    orderBy: { name: "asc" },
    select: { id: true, type: true, name: true },
  });

  return rows.map((row) => ({ ...row, type: row.type as "device" | "product" }));
}
