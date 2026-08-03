"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ICarouselItem, IProductPickerOption } from "@/interfaces/general";
import { UploadField } from "@/components/upload-field";
import { ProductPickerField } from "./product-picker-field";
import { uploadHomeCarouselItemImage } from "./upload-actions";
import { MAX_CAROUSEL_ITEMS } from "./limits";

function SortableItemRow({
  item,
  productOptions,
  onChange,
  onRemove,
}: {
  item: ICarouselItem;
  productOptions: IProductPickerOption[];
  onChange: (next: ICarouselItem) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  // Once an item is picked from the catalogue, its image/link are locked to
  // that product — correcting a wrong pick means removing this row and
  // adding another, same "remove and re-add" precedent as a certification
  // row's fixed style (see ADR-069).
  const isLinked = item.productId != null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("bg-background flex flex-col gap-2 rounded-md border p-3", isDragging && "relative z-10 shadow-lg")}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="text-muted-foreground hover:text-foreground mt-1 shrink-0 cursor-grab touch-none rounded-md p-1 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex-1">
          <span className="text-muted-foreground mb-1 block text-xs font-medium">Browse or Add Item</span>
          <ProductPickerField
            value={item.title}
            options={productOptions}
            onChange={(title) => onChange({ ...item, title })}
            onPick={(option) =>
              onChange({
                ...item,
                title: option.name,
                img: option.thumbnail ?? item.img,
                href: option.url,
                productId: option.id,
              })
            }
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove item"
          onClick={onRemove}
          className="text-destructive hover:text-destructive mt-5 shrink-0"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="flex items-end gap-3 pl-8">
        <div className="w-20 shrink-0">
          <span className="text-muted-foreground mb-1 block text-xs font-medium">Image</span>
          <UploadField
            kind="carouselImage"
            aspect="square"
            uploadAction={uploadHomeCarouselItemImage}
            value={item.img}
            onChange={(value) => onChange({ ...item, img: (value as string) ?? "" })}
            disabled={isLinked}
          />
        </div>
        <div className="flex-1">
          <span className="text-muted-foreground mb-1 block text-xs font-medium">Link</span>
          <Input
            value={item.href}
            onChange={(event) => onChange({ ...item, href: event.target.value })}
            placeholder="/devices/... or https://..."
            disabled={isLinked}
          />
        </div>
      </div>

      {isLinked && (
        <p className="text-muted-foreground pl-8 text-xs">
          Image and link are locked to the picked catalogue item. To use a different
          one, remove this item and add another.
        </p>
      )}
    </div>
  );
}

export function CarouselItemsEditor({
  items,
  productOptions,
  onChange,
}: {
  items: ICarouselItem[];
  productOptions: IProductPickerOption[];
  onChange: (items: ICarouselItem[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Items</span>
        <span className="text-muted-foreground text-xs">
          {items.length} / {MAX_CAROUSEL_ITEMS}
        </span>
      </div>

      {/* No separate scroll region here — the whole modal scrolls (see
          CarouselForm), so this list just grows with it rather than nesting
          a second scrollbar. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {items.length === 0 && (
              <p className="text-muted-foreground py-6 text-center text-xs">No items yet.</p>
            )}
            {items.map((item, index) => (
              <SortableItemRow
                key={item.id}
                item={item}
                productOptions={productOptions}
                onChange={(next) => onChange(items.map((current, i) => (i === index ? next : current)))}
                onRemove={() => onChange(items.filter((_, i) => i !== index))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={items.length >= MAX_CAROUSEL_ITEMS}
        onClick={() =>
          onChange([...items, { id: crypto.randomUUID(), title: "", img: "", href: "", productId: null }])
        }
      >
        Add item <Plus className="size-4" />
      </Button>
    </div>
  );
}
