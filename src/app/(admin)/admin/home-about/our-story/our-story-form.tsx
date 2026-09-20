"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PageBannerFields } from "@/components/page-banner-fields";
import { ImageGridEditor } from "@/components/image-grid-editor";
import { MiniRichTextEditor } from "@/components/mini-rich-text-editor";
import { UploadField } from "@/components/upload-field";
import { CollapsibleSection } from "@/app/(admin)/components/collapsible-section";
import { findMissingBannerVideoFallback, PAGE_BANNER_SIZE_LABELS } from "@/lib/banner-video";
import { hasRichTextContent } from "@/lib/utils";
import type { IAboutImage, IAboutVideo, IAboutWorkCard } from "@/interfaces/general";
import type { AboutPageSlug, IAboutPage } from "@/lib/about-page";
import { AboutCardsEditor } from "./about-cards-editor";
import { AboutVideosEditor } from "./about-videos-editor";
import {
  ACCEPTED_ABOUT_IMAGE_TYPES,
  MAX_ABOUT_BANNER_LABEL,
  MAX_ABOUT_BANNER_VIDEO_LABEL,
  MAX_ABOUT_ICON_LABEL,
  MAX_ABOUT_WHO_IMAGES,
  MAX_ABOUT_WHO_IMAGE_LABEL,
} from "./limits";
import {
  saveAboutPageSection,
  uploadAboutPageBanner,
  uploadAboutPageBannerVideo,
  uploadAboutPageIcon,
  uploadAboutPageWhoImage,
  type AboutPageSection,
} from "./actions";

function RequiredMark() {
  return <span className="text-destructive"> *</span>;
}

// The illustration shown above a section's text.
function IconField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-base font-semibold text-brand-red">Icon</span>
      <span className="text-muted-foreground -mt-1 text-xs">
        JPEG, PNG or WEBP, up to {MAX_ABOUT_ICON_LABEL}. Leave empty to hide it.
      </span>
      <div className="w-52">
        <UploadField
          kind="image"
          aspect="square"
          uploadAction={uploadAboutPageIcon}
          value={value}
          onChange={(next) => onChange((next as string) ?? "")}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function BodyField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-base font-semibold text-brand-red">
        Text
        <RequiredMark />
      </span>
      <MiniRichTextEditor mode="body" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

export function OurStoryForm({
  slug,
  initialData,
}: {
  slug: AboutPageSlug;
  initialData: IAboutPage;
}) {
  const [bannerXlUrl, setBannerXlUrl] = useState(initialData.bannerXlUrl ?? "");
  const [bannerXlVideoUrl, setBannerXlVideoUrl] = useState(initialData.bannerXlVideoUrl ?? "");
  const [bannerMdUrl, setBannerMdUrl] = useState(initialData.bannerMdUrl ?? "");
  const [bannerMdVideoUrl, setBannerMdVideoUrl] = useState(initialData.bannerMdVideoUrl ?? "");
  const [bannerSmUrl, setBannerSmUrl] = useState(initialData.bannerSmUrl ?? "");
  const [bannerSmVideoUrl, setBannerSmVideoUrl] = useState(initialData.bannerSmVideoUrl ?? "");
  const [bannerVideoUseForSmaller, setBannerVideoUseForSmaller] = useState(initialData.bannerVideoUseForSmaller);
  const [whoIconUrl, setWhoIconUrl] = useState(initialData.whoIconUrl ?? "");
  const [whoBody, setWhoBody] = useState(initialData.whoBody ?? "");
  const [whoImages, setWhoImages] = useState<IAboutImage[]>(initialData.whoImages);
  const [videos, setVideos] = useState<IAboutVideo[]>(initialData.videos);
  const [whatIconUrl, setWhatIconUrl] = useState(initialData.whatIconUrl ?? "");
  const [whatBody, setWhatBody] = useState(initialData.whatBody ?? "");
  const [workIconUrl, setWorkIconUrl] = useState(initialData.workIconUrl ?? "");
  const [workBody, setWorkBody] = useState(initialData.workBody ?? "");
  const [workCards, setWorkCards] = useState<IAboutWorkCard[]>(
    initialData.workCards.length > 0
      ? initialData.workCards
      : [{ id: "card-1", icon: "", title: "", description: "" }]
  );
  // `section` records which section's Save button was pressed so the result
  // message renders next to that button only.
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
    section: AboutPageSection;
  } | null>(null);
  const [savingSection, setSavingSection] = useState<AboutPageSection | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmitBanner = bannerXlUrl.length > 0;

  // Builds only the fields the given section owns — the server action saves
  // just those columns, so a section's Save never touches the others (ADR-102).
  const buildSectionFormData = (section: AboutPageSection): FormData => {
    const formData = new FormData();
    switch (section) {
      case "banner":
        formData.set("bannerXlUrl", bannerXlUrl);
        if (bannerXlVideoUrl) formData.set("bannerXlVideoUrl", bannerXlVideoUrl);
        if (bannerMdUrl) formData.set("bannerMdUrl", bannerMdUrl);
        if (bannerMdVideoUrl) formData.set("bannerMdVideoUrl", bannerMdVideoUrl);
        if (bannerSmUrl) formData.set("bannerSmUrl", bannerSmUrl);
        if (bannerSmVideoUrl) formData.set("bannerSmVideoUrl", bannerSmVideoUrl);
        formData.set("bannerVideoUseForSmaller", bannerVideoUseForSmaller ? "true" : "false");
        break;
      case "who":
        if (whoIconUrl) formData.set("whoIconUrl", whoIconUrl);
        if (hasRichTextContent(whoBody)) formData.set("whoBody", whoBody);
        formData.set("whoImages", JSON.stringify(whoImages));
        break;
      case "videos":
        formData.set("videos", JSON.stringify(videos));
        break;
      case "what":
        if (whatIconUrl) formData.set("whatIconUrl", whatIconUrl);
        if (hasRichTextContent(whatBody)) formData.set("whatBody", whatBody);
        break;
      case "work":
        if (workIconUrl) formData.set("workIconUrl", workIconUrl);
        if (hasRichTextContent(workBody)) formData.set("workBody", workBody);
        formData.set("workCards", JSON.stringify(workCards));
        break;
    }
    return formData;
  };

  const handleSave = (section: AboutPageSection) => {
    setMessage(null);
    setSavingSection(section);

    if (section === "banner") {
      const fallbackError = findMissingBannerVideoFallback([
        { label: PAGE_BANNER_SIZE_LABELS.Xl, imageUrl: bannerXlUrl, videoUrl: bannerXlVideoUrl },
        { label: PAGE_BANNER_SIZE_LABELS.Md, imageUrl: bannerMdUrl, videoUrl: bannerMdVideoUrl },
        { label: PAGE_BANNER_SIZE_LABELS.Sm, imageUrl: bannerSmUrl, videoUrl: bannerSmVideoUrl },
      ]);
      if (fallbackError) {
        setMessage({ type: "error", text: fallbackError, section });
        return;
      }
    }

    startTransition(async () => {
      const result = await saveAboutPageSection(slug, section, buildSectionFormData(section));
      setMessage(
        result.success
          ? { type: "success", text: "Saved.", section }
          : { type: "error", text: result.error.message, section }
      );
    });
  };

  const renderSaveBar = (section: AboutPageSection) => (
    <div className="flex items-center justify-start gap-3">
      <Button
        type="button"
        onClick={() => handleSave(section)}
        disabled={isPending || (section === "banner" && !canSubmitBanner)}
        className="w-32"
      >
        {isPending && savingSection === section ? "Saving..." : "Save"}
      </Button>
      {message?.section === section && (
        <p className={message.type === "error" ? "text-destructive text-sm" : "text-emerald-600 text-sm"}>
          {message.text}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col">
      <CollapsibleSection title="Banner">
        <PageBannerFields
          bannerXlUrl={bannerXlUrl}
          bannerXlVideoUrl={bannerXlVideoUrl}
          bannerMdUrl={bannerMdUrl}
          bannerMdVideoUrl={bannerMdVideoUrl}
          bannerSmUrl={bannerSmUrl}
          bannerSmVideoUrl={bannerSmVideoUrl}
          bannerVideoUseForSmaller={bannerVideoUseForSmaller}
          onBannerXlUrlChange={setBannerXlUrl}
          onBannerXlVideoUrlChange={setBannerXlVideoUrl}
          onBannerMdUrlChange={setBannerMdUrl}
          onBannerMdVideoUrlChange={setBannerMdVideoUrl}
          onBannerSmUrlChange={setBannerSmUrl}
          onBannerSmVideoUrlChange={setBannerSmVideoUrl}
          onBannerVideoUseForSmallerChange={setBannerVideoUseForSmaller}
          uploadImageAction={uploadAboutPageBanner}
          uploadVideoAction={uploadAboutPageBannerVideo}
          imageSizeLabel={MAX_ABOUT_BANNER_LABEL}
          videoSizeLabel={MAX_ABOUT_BANNER_VIDEO_LABEL}
          disabled={isPending}
        />
        {renderSaveBar("banner")}
      </CollapsibleSection>

      <hr className="my-2 border-t" />

      <CollapsibleSection title="Who">
        <IconField value={whoIconUrl} onChange={setWhoIconUrl} disabled={isPending} />
        <BodyField
          value={whoBody}
          onChange={setWhoBody}
          placeholder="Radian Elok Distriversa, or commonly known as RED Indonesia, was founded in 2004..."
        />
        <ImageGridEditor
          label="Images"
          addLabel="Add image"
          hint={`JPEG, PNG or WEBP, up to ${MAX_ABOUT_WHO_IMAGE_LABEL} each — pick several at once, drag to reorder.`}
          value={whoImages}
          onChange={setWhoImages}
          uploadAction={uploadAboutPageWhoImage}
          accept={ACCEPTED_ABOUT_IMAGE_TYPES}
          max={MAX_ABOUT_WHO_IMAGES}
          disabled={isPending}
        />
        {renderSaveBar("who")}
      </CollapsibleSection>

      <hr className="my-2 border-t" />

      <CollapsibleSection title="Videos">
        <AboutVideosEditor value={videos} onChange={setVideos} disabled={isPending} />
        {renderSaveBar("videos")}
      </CollapsibleSection>

      <hr className="my-2 border-t" />

      <CollapsibleSection title="What">
        <IconField value={whatIconUrl} onChange={setWhatIconUrl} disabled={isPending} />
        <BodyField
          value={whatBody}
          onChange={setWhatBody}
          placeholder="At RED Indonesia, we believe that world-class clinical results..."
        />
        {renderSaveBar("what")}
      </CollapsibleSection>

      <hr className="my-2 border-t" />

      <CollapsibleSection title="Work">
        <IconField value={workIconUrl} onChange={setWorkIconUrl} disabled={isPending} />
        <BodyField
          value={workBody}
          onChange={setWorkBody}
          placeholder="At RED Indonesia, we believe great technology is only half the battle..."
        />
        <AboutCardsEditor value={workCards} onChange={setWorkCards} disabled={isPending} />
        {renderSaveBar("work")}
      </CollapsibleSection>
    </div>
  );
}
