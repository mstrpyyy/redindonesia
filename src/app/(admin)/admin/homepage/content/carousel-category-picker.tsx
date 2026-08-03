"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICategory } from "@/interfaces/general";

interface IFlatCategoryOption {
  id: string;
  name: string;
  indent: number; // 0 for a root's direct children, 1 for the level below, etc.
  selectable: boolean; // only leaves (nodes with no children of their own) are pickable
}

interface ICategoryGroup {
  rootId: string;
  rootName: string;
  options: IFlatCategoryOption[];
}

// Same grouped, indented tree as the product editor's own CategoryPicker
// (category-picker.tsx), one group per depth-1 root with its name as a
// non-selectable header. The difference is "the lowest level of each
// branch" (ADR-066) still applies here — only leaf nodes are selectable,
// intermediate ancestors are shown for context but can't be picked. Unlike
// that picker (whose roots always have children in practice), a root with
// no children at all still counts as the lowest level of its own branch, so
// it's selectable too.
function flattenDescendants(nodes: ICategory[], indent: number): IFlatCategoryOption[] {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, indent, selectable: node.children.length === 0 },
    ...flattenDescendants(node.children, indent + 1),
  ]);
}

function buildGroups(categories: ICategory[]): ICategoryGroup[] {
  return categories.map((root) => ({
    rootId: root.id,
    rootName: root.name,
    options:
      root.children.length === 0
        ? [{ id: root.id, name: root.name, indent: 0, selectable: true }]
        : flattenDescendants(root.children, 0),
  }));
}

function CategoryGroups({ groups, emptyLabel }: { groups: ICategoryGroup[]; emptyLabel: string }) {
  if (groups.length === 0) {
    return <div className="text-muted-foreground px-2 py-1.5 text-sm">{emptyLabel}</div>;
  }

  return groups.map((group) => (
    <SelectGroup key={group.rootId}>
      <SelectLabel>{group.rootName}</SelectLabel>
      {group.options.map((option) =>
        option.selectable ? (
          <SelectItem key={option.id} value={option.id} style={{ paddingLeft: `${8 + option.indent * 16}px` }}>
            {option.name}
          </SelectItem>
        ) : (
          <p
            key={option.id}
            className="text-muted-foreground px-2 py-1 text-xs"
            style={{ paddingLeft: `${8 + option.indent * 16}px` }}
          >
            {option.name}
          </p>
        )
      )}
    </SelectGroup>
  ));
}

export function CarouselCategoryPicker({
  deviceCategories,
  productCategories,
  value,
  onChange,
  disabled,
}: {
  deviceCategories: ICategory[];
  productCategories: ICategory[];
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
}) {
  const deviceGroups = buildGroups(deviceCategories);
  const productGroups = buildGroups(productCategories);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        <CategoryGroups groups={deviceGroups} emptyLabel="No device categories yet." />
        <SelectSeparator />
        <CategoryGroups groups={productGroups} emptyLabel="No product categories yet." />
      </SelectContent>
    </Select>
  );
}
