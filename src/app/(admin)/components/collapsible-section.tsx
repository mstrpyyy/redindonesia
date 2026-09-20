"use client";

import { ChevronDown } from "lucide-react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";
import { AdminSectionTitle } from "@/app/(admin)/components/admin-section-title";

// An admin page section: the usual `AdminSectionTitle`, made into a toggle
// that folds the section's body away. Collapsed by default. The body stays mounted
// while collapsed (just hidden) so rich-text editors and in-flight uploads
// inside it aren't torn down. The toggle spans the whole header width.
export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <CollapsiblePrimitive.Root defaultOpen={defaultOpen} className="flex flex-col gap-4">
      <AdminSectionTitle>
        <CollapsiblePrimitive.Trigger className="group flex w-full cursor-pointer items-center justify-between gap-2 text-left py-2">
          {title}
          <ChevronDown className="text-muted-foreground size-5 shrink-0 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
        </CollapsiblePrimitive.Trigger>
      </AdminSectionTitle>
      <CollapsiblePrimitive.Content forceMount className="flex flex-col gap-4 pb-6 data-[state=closed]:hidden">
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
