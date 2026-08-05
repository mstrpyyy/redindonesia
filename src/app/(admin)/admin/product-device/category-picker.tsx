"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICategory } from "@/interfaces/general";

interface IFlatCategoryOption {
  id: string;
  name: string;
  indent: number; // 0 for a depth-1 root's direct children, 1 for the level below, etc.
}

interface ICategoryGroup {
  rootId: string;
  options: IFlatCategoryOption[];
}

// One group per depth-1 category, root itself included as a selectable
// option (indent 0) alongside every descendant (indent 1+) — e.g.:
//   Medical Aesthetic Devices   <- selectable, indent 0 (the root itself)
//       Alma Beauty             <- selectable, indent 1
//           Alma Harmony        <- selectable, indent 2
// No group header: every row here is clickable (a product can be filed
// directly at the highest level, same as any other depth), so a
// non-selectable label would just be a second, confusing copy of the root's
// own row right above it. Indentation alone conveys the hierarchy. A plain
// grouped Select rather than a search-as-you-type combobox, since this
// project has no cmdk/Command component installed yet and the category
// trees are small enough that scanning a list is fine.
function buildGroups(categories: ICategory[]): ICategoryGroup[] {
  const flattenDescendants = (nodes: ICategory[], indent: number): IFlatCategoryOption[] =>
    nodes.flatMap((node) => [
      { id: node.id, name: node.name, indent },
      ...flattenDescendants(node.children, indent + 1),
    ]);

  return categories.map((root) => ({
    rootId: root.id,
    options: [{ id: root.id, name: root.name, indent: 0 }, ...flattenDescendants(root.children, 1)],
  }));
}

export function CategoryPicker({
  categories,
  value,
  onChange,
  disabled,
}: {
  categories: ICategory[];
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
}) {
  const groups = buildGroups(categories);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        {groups.length === 0 && (
          <div className="text-muted-foreground px-2 py-1.5 text-sm">No categories yet.</div>
        )}
        {groups.map((group) => (
          <SelectGroup key={group.rootId}>
            {group.options.map((option) => (
              <SelectItem
                key={option.id}
                value={option.id}
                style={{ paddingLeft: `${8 + option.indent * 16}px` }}
              >
                {option.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
