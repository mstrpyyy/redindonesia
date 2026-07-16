"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ISocialAccount } from "@/interfaces/general";
import { createSocialAccount, updateSocialAccount } from "./actions";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PROFILE_IMG_LABEL,
  MAX_PROFILE_IMG_SIZE,
} from "./upload-limits";

const PLATFORM_OPTIONS = ["instagram", "tiktok", "facebook", "youtube", "twitter"];

interface ISocialAccountFormProps {
  account?: ISocialAccount;
  onSuccess?: () => void;
}

export function SocialAccountForm({ account, onSuccess }: ISocialAccountFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [platform, setPlatform] = useState(account?.platform ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = account !== undefined;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("platform", platform);

    // Reject oversized/invalid files here — the Server Action body limit (1MB)
    // would otherwise kill the request with an opaque runtime error.
    const file = formData.get("profileImg");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_PROFILE_IMG_SIZE) {
        setError(`Profile image must be smaller than ${MAX_PROFILE_IMG_LABEL}.`);
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError("Profile image must be a JPEG, PNG, WEBP, or GIF.");
        return;
      }
    }

    startTransition(async () => {
      try {
        const result = isEdit
          ? await updateSocialAccount(account.id, formData)
          : await createSocialAccount(formData);
        if (!result.success) {
          setError(result.error.message);
          return;
        }
        formRef.current?.reset();
        if (!isEdit) setPlatform("");
        onSuccess?.();
      } catch {
        setError("Something went wrong while saving. Please try again.");
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="platform">Platform</Label>
        <Select value={platform} onValueChange={setPlatform} required>
          <SelectTrigger id="platform" className="w-full">
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="label">Username</Label>e
        <Input
          id="label"
          name="label"
          placeholder="Radian Elok Distriversa"
          defaultValue={account?.label}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="profileImg">Profile Image</Label>
        {isEdit && (
          <div className="flex items-center gap-3">
            <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-md">
              <Image
                src={account.profileImg}
                alt={account.label}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Current image — choose a file to replace it, or leave empty to keep it.
            </p>
          </div>
        )}
        <Input
          id="profileImg"
          name="profileImg"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required={!isEdit}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="url">URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://..."
          defaultValue={account?.url}
          required
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
