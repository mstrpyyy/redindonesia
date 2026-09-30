import { notFound } from "next/navigation";
import { getDigitalItemById } from "@/lib/digital";
import { DigitalForm } from "../digital-form";

interface IPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function DigitalEditorPage({ searchParams }: IPageProps) {
  const { id } = await searchParams;
  const item = id ? await getDigitalItemById(id) : null;

  if (id && !item) notFound();

  return (
    <div className="rounded-md border p-6 shadow-lg">
      <h2 className="h2-md-format mb-6 font-semibold">{item ? "Edit Digital Link" : "Digital Link Editor"}</h2>
      <DigitalForm item={item ?? undefined} />
    </div>
  );
}
