"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICategory } from "@/interfaces/general";

interface ILeafOption {
  id: string;
  label: string;
}

// Only nodes with no children of their own — "the lowest level of each
// branch." Unlike the product editor's own CategoryPicker (which never lets
// an admin pick a root, since a root always has sub-brands in practice for
// that feature), a root with no children at all still counts as the lowest
// level of its branch here, so it's included too.
function collectLeaves(nodes: ICategory[], ancestors: string[]): ILeafOption[] {
  return nodes.flatMap((node) => {
    const breadcrumb = [...ancestors, node.name];
    if (node.children.length === 0) {
      return [{ id: node.id, label: breadcrumb.join(" > ") }];
    }
    return collectLeaves(node.children, breadcrumb);
  });
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
  const deviceLeaves = collectLeaves(deviceCategories, []);
  const productLeaves = collectLeaves(productCategories, []);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Devices</SelectLabel>
          {deviceLeaves.length === 0 ? (
            <p className="text-muted-foreground px-2 py-1 text-xs">No device categories yet.</p>
          ) : (
            deviceLeaves.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))
          )}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Products</SelectLabel>
          {productLeaves.length === 0 ? (
            <p className="text-muted-foreground px-2 py-1 text-xs">No product categories yet.</p>
          ) : (
            productLeaves.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))
          )}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
