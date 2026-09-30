"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IBrand, ICategoryUrlSuggestion } from "@/interfaces/general";
import { createBrand, updateBrand } from "./actions";
import { ACCEPTED_LOGO_TYPES, MAX_LOGO_LABEL, MAX_LOGO_SIZE } from "./limits";

interface IBrandFormProps {
  brand?: IBrand;
  urlSuggestions: ICategoryUrlSuggestion[];
  onSuccess?: () => void;
}

export function BrandForm({ brand, urlSuggestions, onSuccess }: IBrandFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = brand !== undefined;
  const displayedLogo = previewUrl ?? brand?.logo ?? null;

  // Revoke the previous object URL whenever it's replaced or the form unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleLogoChange = (files: FileList | null) => {
    const file = files?.[0];
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);

    // Reject oversized/invalid files here — the Server Action body limit
    // (1MB) would otherwise kill the request with an opaque runtime error.
    const file = formData.get("logo");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_LOGO_SIZE) {
        setError(`Logo must be smaller than ${MAX_LOGO_LABEL}.`);
        return;
      }
      if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
        setError("Logo must be a JPEG, PNG, WEBP, or GIF.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const result = isEdit ? await updateBrand(brand.id, formData) : await createBrand(formData);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        formRef.current?.reset();
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return null;
        });
        onSuccess?.();
      } catch {
        setError("Something went wrong while saving. Please try again.");
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="logo">
          Logo <span className="text-destructive">*</span>
        </Label>
        {/* Visually hidden (not `hidden`/display:none) so the file input
            stays focusable — a display:none required input silently blocks
            native form submission in some browsers. The square button below
            is the actual click target. */}
        <input
          ref={fileInputRef}
          id="logo"
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => handleLogoChange(event.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-muted hover:border-foreground/50 relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors"
        >
          {displayedLogo ? (
            <Image
              src={displayedLogo}
              alt={brand?.name ?? "Logo preview"}
              fill
              sizes="96px"
              unoptimized={displayedLogo.startsWith("blob:")}
              className="object-contain"
            />
          ) : (
            <ImagePlus className="text-muted-foreground size-6" />
          )}
        </button>
        <p className="text-muted-foreground text-xs">
          Square image recommended. JPEG, PNG, WEBP, or GIF, up to {MAX_LOGO_LABEL}.
          {isEdit && " Leave unchanged to keep the current logo."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input id="name" name="name" placeholder="Alma Laser" defaultValue={brand?.name} required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          name="url"
          list="brand-url-suggestions"
          placeholder="/devices/... or https://..."
          defaultValue={brand?.url ?? ""}
        />
        {/* Native datalist — offers every catalogue page/product as a
            suggestion while still accepting any other URL typed in freely. */}
        <datalist id="brand-url-suggestions">
          {urlSuggestions.map((suggestion) => (
            <option key={suggestion.url} value={suggestion.url}>
              {suggestion.label}
            </option>
          ))}
        </datalist>
        <p className="text-muted-foreground text-xs">
          Optional. Pick a suggested catalogue page or product from the list, or paste any other URL.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
