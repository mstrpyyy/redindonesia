"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Monitor, Smartphone, Tablet } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadField } from "@/components/upload-field";
import { cn } from "@/lib/utils";
import { findMissingBannerVideoFallback } from "@/lib/banner-video";
import type { IDigitalItem, IDigitalMediaBlock } from "@/interfaces/digital";
import { createDigitalItem, updateDigitalItem } from "./digital-actions";
import { uploadDigitalBannerImage, uploadDigitalBannerVideo, uploadDigitalQrImage } from "./digital-upload-actions";
import { isDigitalMediaComplete } from "./digital-media";
import { MediaBlocksEditor } from "./media-blocks-editor";
import { MAX_DIGITAL_NAME_LENGTH, MAX_DIGITAL_QR_IMAGE_LABEL } from "./limits";

type IEditorTab = "qr-name" | "background" | "media";

const EDITOR_TABS: IEditorTab[] = ["qr-name", "background", "media"];

function EditorTabTrigger({ value, label, complete }: { value: IEditorTab; label: string; complete: boolean }) {
  return (
    <TabsTrigger value={value}>
      <CircleCheck className={cn(complete ? "text-emerald-600" : "text-muted-foreground/50")} />
      {label}
    </TabsTrigger>
  );
}

type BannerSizeKey = "Xl" | "Lg" | "Md" | "Sm";

// Same 4-size table as the Category page banner (product-device/category-tree.tsx,
// ADR-093) — reused here per ADR-105 for consistency rather than inventing a
// simpler single-image field.
const BANNER_SIZES: {
  key: BannerSizeKey;
  label: string;
  required: boolean;
  aspect: "video" | "4:3" | "3:4" | "9:16";
  boxSizeClassName: string;
  Icon: typeof Monitor;
  iconClassName?: string;
}[] = [
  { key: "Xl", label: "1920x1080", required: true, aspect: "video", boxSizeClassName: "w-36 h-24", Icon: Monitor },
  { key: "Lg", label: "1440x1080", required: false, aspect: "4:3", boxSizeClassName: "w-28 h-24", Icon: Tablet, iconClassName: "rotate-90" },
  { key: "Md", label: "1080x1440", required: false, aspect: "3:4", boxSizeClassName: "w-24 h-32", Icon: Tablet },
  { key: "Sm", label: "1080x1920", required: false, aspect: "9:16", boxSizeClassName: "w-20 h-32", Icon: Smartphone },
];

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

interface IDigitalFormProps {
  item?: IDigitalItem;
}

export function DigitalForm({ item }: IDigitalFormProps) {
  const router = useRouter();
  const isEdit = item !== undefined;
  const listPath = "/admin/digital";

  const [name, setName] = useState(item?.name ?? "");
  const [status, setStatus] = useState<"hidden" | "public">(item?.status ?? "hidden");
  const [qrImageUrl, setQrImageUrl] = useState(item?.qrImageUrl ?? "");

  const [bannerSmUrl, setBannerSmUrl] = useState(item?.bannerSmUrl ?? "");
  const [bannerSmVideoUrl, setBannerSmVideoUrl] = useState(item?.bannerSmVideoUrl ?? "");
  const [bannerMdUrl, setBannerMdUrl] = useState(item?.bannerMdUrl ?? "");
  const [bannerMdVideoUrl, setBannerMdVideoUrl] = useState(item?.bannerMdVideoUrl ?? "");
  const [bannerLgUrl, setBannerLgUrl] = useState(item?.bannerLgUrl ?? "");
  const [bannerLgVideoUrl, setBannerLgVideoUrl] = useState(item?.bannerLgVideoUrl ?? "");
  const [bannerXlUrl, setBannerXlUrl] = useState(item?.bannerXlUrl ?? "");
  const [bannerXlVideoUrl, setBannerXlVideoUrl] = useState(item?.bannerXlVideoUrl ?? "");
  const [bannerVideoUseForSmaller, setBannerVideoUseForSmaller] = useState(item?.bannerVideoUseForSmaller ?? false);

  const [media, setMedia] = useState<IDigitalMediaBlock[]>(item?.media ?? []);

  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [tab, setTab] = useState<IEditorTab>("qr-name");
  const [isPending, startTransition] = useTransition();

  const nextTab: IEditorTab | undefined = EDITOR_TABS[EDITOR_TABS.indexOf(tab) + 1];

  const qrNameComplete = name.trim().length > 0 && qrImageUrl !== "";
  const backgroundComplete = bannerXlUrl !== "";
  const mediaComplete = isDigitalMediaComplete(media);

  const bannerFields: Record<
    BannerSizeKey,
    { imageUrl: string; videoUrl: string; setImageUrl: (value: string) => void; setVideoUrl: (value: string) => void }
  > = {
    Xl: { imageUrl: bannerXlUrl, videoUrl: bannerXlVideoUrl, setImageUrl: setBannerXlUrl, setVideoUrl: setBannerXlVideoUrl },
    Lg: { imageUrl: bannerLgUrl, videoUrl: bannerLgVideoUrl, setImageUrl: setBannerLgUrl, setVideoUrl: setBannerLgVideoUrl },
    Md: { imageUrl: bannerMdUrl, videoUrl: bannerMdVideoUrl, setImageUrl: setBannerMdUrl, setVideoUrl: setBannerMdVideoUrl },
    Sm: { imageUrl: bannerSmUrl, videoUrl: bannerSmVideoUrl, setImageUrl: setBannerSmUrl, setVideoUrl: setBannerSmVideoUrl },
  };
  const hasAnyBannerVideo = Boolean(bannerXlVideoUrl || bannerLgVideoUrl || bannerMdVideoUrl || bannerSmVideoUrl);

  const isDirty =
    name !== (item?.name ?? "") ||
    status !== (item?.status ?? "hidden") ||
    qrImageUrl !== (item?.qrImageUrl ?? "") ||
    bannerSmUrl !== (item?.bannerSmUrl ?? "") ||
    bannerSmVideoUrl !== (item?.bannerSmVideoUrl ?? "") ||
    bannerMdUrl !== (item?.bannerMdUrl ?? "") ||
    bannerMdVideoUrl !== (item?.bannerMdVideoUrl ?? "") ||
    bannerLgUrl !== (item?.bannerLgUrl ?? "") ||
    bannerLgVideoUrl !== (item?.bannerLgVideoUrl ?? "") ||
    bannerXlUrl !== (item?.bannerXlUrl ?? "") ||
    bannerXlVideoUrl !== (item?.bannerXlVideoUrl ?? "") ||
    bannerVideoUseForSmaller !== (item?.bannerVideoUseForSmaller ?? false) ||
    JSON.stringify(media) !== JSON.stringify(item?.media ?? []);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleSubmit = (nextStatus: "hidden" | "public") => {
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      setTab("qr-name");
      return;
    }
    if (nextStatus === "public" && !qrImageUrl) {
      setError("A QR image is required to publish.");
      setTab("qr-name");
      return;
    }

    const fallbackError = findMissingBannerVideoFallback([
      { label: "1920x1080", imageUrl: bannerXlUrl, videoUrl: bannerXlVideoUrl },
      { label: "1440x1080", imageUrl: bannerLgUrl, videoUrl: bannerLgVideoUrl },
      { label: "1080x1440", imageUrl: bannerMdUrl, videoUrl: bannerMdVideoUrl },
      { label: "1080x1920", imageUrl: bannerSmUrl, videoUrl: bannerSmVideoUrl },
    ]);
    if (fallbackError) {
      setError(fallbackError);
      setTab("background");
      return;
    }
    if (nextStatus === "public" && !backgroundComplete) {
      setError("A background image (1920x1080) is required to publish.");
      setTab("background");
      return;
    }
    if (nextStatus === "public" && !mediaComplete) {
      setError("At least one media type is required, and every entry must be filled in, to publish.");
      setTab("media");
      return;
    }

    const formData = new FormData();
    formData.set("name", name);
    formData.set("status", nextStatus);
    formData.set("qrImageUrl", qrImageUrl);
    formData.set("bannerSmUrl", bannerSmUrl);
    formData.set("bannerSmVideoUrl", bannerSmVideoUrl);
    formData.set("bannerMdUrl", bannerMdUrl);
    formData.set("bannerMdVideoUrl", bannerMdVideoUrl);
    formData.set("bannerLgUrl", bannerLgUrl);
    formData.set("bannerLgVideoUrl", bannerLgVideoUrl);
    formData.set("bannerXlUrl", bannerXlUrl);
    formData.set("bannerXlVideoUrl", bannerXlVideoUrl);
    formData.set("bannerVideoUseForSmaller", bannerVideoUseForSmaller ? "true" : "false");
    formData.set("media", JSON.stringify(media));

    startTransition(async () => {
      const result = isEdit ? await updateDigitalItem(item.id, formData) : await createDigitalItem(formData);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(listPath);
    });
  };

  const handleCancelClick = () => {
    if (isDirty) setConfirmingCancel(true);
    else router.push(listPath);
  };

  return (
    <div className="flex flex-col gap-8">
      <Tabs value={tab} onValueChange={(value) => setTab(value as IEditorTab)} className="gap-6">
        <TabsList className="w-full">
          <EditorTabTrigger value="qr-name" label="QR & Name" complete={qrNameComplete} />
          <EditorTabTrigger value="background" label="Background Images" complete={backgroundComplete} />
          <EditorTabTrigger value="media" label="Media" complete={mediaComplete} />
        </TabsList>

        <TabsContent value="qr-name" className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-red">QR & Name</h3>
            <p className="text-muted-foreground text-xs">
              The QR code shown (and clickable) in the digital catalogue list, and the item&apos;s accessible/SEO name.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>
                QR Code Image<span className="text-destructive"> *</span>
              </Label>
              <UploadField
                kind="image"
                aspect="3:4"
                boxSizeClassName="w-48 h-64"
                uploadAction={uploadDigitalQrImage}
                value={qrImageUrl}
                onChange={(value) => setQrImageUrl((value as string) ?? "")}
              />
              <p className="text-muted-foreground text-xs">Suggested 4:3 vertical ratio — auto-centered if the image differs.</p>
              <p className="text-muted-foreground text-xs">JPEG, PNG, or WEBP. Up to {MAX_DIGITAL_QR_IMAGE_LABEL}.</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">
                  Name<span className="text-destructive"> *</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={MAX_DIGITAL_NAME_LENGTH}
                  placeholder="e.g. Alma Harmony Digital Catalogue"
                />
                <p className="text-muted-foreground text-xs">
                  Not shown as a heading — used for accessibility and SEO (the QR&apos;s accessible label, page title).
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as "hidden" | "public")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hidden">Draft</SelectItem>
                    <SelectItem value="public">Publish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="background" className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-red">Background Images</h3>
            <p className="text-muted-foreground text-xs">
              Image: up to 2MB, JPEG/PNG/WEBP. Video: up to 10MB, MP4, optional per size — image is used as fallback.
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent divide-x">
                  {BANNER_SIZES.map((size) => (
                    <TableHead key={size.key} className="text-center">
                      <div className="flex flex-col items-center gap-1.5 py-2">
                        <size.Icon className={cn("text-muted-foreground size-6", size.iconClassName)} />
                        <span className="text-xs font-semibold whitespace-nowrap">
                          {size.label}
                          {size.required && <RequiredMark />}
                        </span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent divide-x">
                  {BANNER_SIZES.map((size) => {
                    const field = bannerFields[size.key];
                    return (
                      <TableCell key={size.key} className="align-top">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex flex-col items-center gap-1.5">
                            <Label className="text-xs font-medium text-foreground">
                              Image
                              {size.required && <RequiredMark />}
                            </Label>
                            <UploadField
                              kind="image"
                              aspect={size.aspect}
                              fit="cover"
                              boxSizeClassName={size.boxSizeClassName}
                              uploadAction={uploadDigitalBannerImage}
                              value={field.imageUrl}
                              onChange={(value) => field.setImageUrl((value as string) ?? "")}
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1.5">
                            <Label className="text-xs font-medium text-foreground">Video</Label>
                            <UploadField
                              kind="video"
                              aspect={size.aspect}
                              fit="cover"
                              boxSizeClassName={size.boxSizeClassName}
                              uploadAction={uploadDigitalBannerVideo}
                              value={field.videoUrl}
                              onChange={(value) => field.setVideoUrl((value as string) ?? "")}
                            />
                          </div>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {hasAnyBannerVideo && (
            <label className="flex items-start gap-2.5 pt-1">
              <Switch
                checked={bannerVideoUseForSmaller}
                onCheckedChange={setBannerVideoUseForSmaller}
                className="mt-0.5 shrink-0"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">Use existing video for empty screen sizes</span>
                <span className="text-muted-foreground text-xs">
                  Screen size with no video will use the larger size&apos;s video if it exists.
                </span>
              </span>
            </label>
          )}
        </TabsContent>

        <TabsContent value="media" className="flex flex-col gap-6">
          <div>
            <h3 className="text-lg font-semibold text-brand-red">Media</h3>
            <p className="text-muted-foreground text-xs">
              Add the media buttons this item&apos;s page offers. A media type can be added more than once.
            </p>
          </div>

          <MediaBlocksEditor blocks={media} onChange={setMedia} />
        </TabsContent>
      </Tabs>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleCancelClick}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => handleSubmit("hidden")} className="w-36">
            {isPending ? "Saving..." : "Save as Draft"}
          </Button>
          {nextTab ? (
            <Button type="button" disabled={isPending} onClick={() => setTab(nextTab)} className="w-36">
              Next
            </Button>
          ) : (
            <Button type="button" disabled={isPending} onClick={() => handleSubmit("public")} className="w-36">
              {isPending ? "Publishing..." : "Publish"}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmingCancel} onOpenChange={setConfirmingCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes. Leaving now will discard them.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(listPath)}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
