"use client";

import { Eye, ImageIcon, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UploadField } from "@/components/upload-field";
import { MAX_HERO_DOC_TITLE_LENGTH } from "./limits";
import { CERTIFICATION_LOGOS } from "@/lib/certification-logos";
import type { ICertification, IHeroDoc } from "@/interfaces/segments";

// Downloadable documents and certification badges used to be two fields on the
// hero segment, edited inside the segments builder's generic field engine (a
// `list` field and a bespoke `CertificationsField`). They render in the hero
// on the public page and still live on the hero segment's record — only the
// editing moved here, to a tab of their own with a flat one-row-per-entry
// layout instead of a stack of bordered field cards. See ADR-026.

// Seeded with the white variant — this editor's own row preview doesn't
// react to a hero color the way the public page does (ADR-049); the public
// render picks white or black from the same `CERTIFICATION_LOGOS` pair.
const CERTIFICATION_HALAL_LOGO = CERTIFICATION_LOGOS.halal.white;
const CERTIFICATION_KEMENKES_LOGO = CERTIFICATION_LOGOS.kemenkes.white;
const CERTIFICATION_BPOM_LOGO = CERTIFICATION_LOGOS.bpom.white;

// One list behind both the add-time menu and each row's type label, so the two
// can't drift apart.
const CERTIFICATION_TYPES: { value: ICertification["certType"]; label: string }[] = [
  { value: "halal", label: "Halal Indonesia" },
  { value: "kemenkes", label: "Kemenkes" },
  { value: "bpom", label: "BPOM" },
  { value: "other", label: "Other" },
  { value: "lkpp", label: "LKPP" },
];

function getCertificationTypeLabel(certType: ICertification["certType"]): string {
  return CERTIFICATION_TYPES.find((option) => option.value === certType)?.label ?? certType;
}

// Each certification "style" has a fixed shape — Halal, Kemenkes, and BPOM
// carry a hardcoded logo and label the admin never types, each needing its
// own registration/certificate number, and "Other" is the only one with a
// free-text name. See ADR-022, ADR-046.
function createCertification(certType: ICertification["certType"]): ICertification {
  const id = crypto.randomUUID();
  if (certType === "halal") {
    return {
      id,
      certType: "halal",
      label: "Halal Indonesia",
      imageUrl: CERTIFICATION_HALAL_LOGO,
      certificateNumber: "",
      fileUrl: "",
    };
  }
  if (certType === "kemenkes") {
    return { id, certType: "kemenkes", label: "Kemenkes", imageUrl: CERTIFICATION_KEMENKES_LOGO, aklNumber: "", fileUrl: "" };
  }
  if (certType === "bpom") {
    return { id, certType: "bpom", label: "BPOM", imageUrl: CERTIFICATION_BPOM_LOGO, registrationNumber: "", fileUrl: "" };
  }
  if (certType === "lkpp") {
    return { id, certType: "lkpp", label: "LKPP", linkUrl: "" };
  }
  return { id, certType: "other", label: "", fileUrl: "" };
}

export function isHeroDocComplete(doc: IHeroDoc): boolean {
  return doc.title.trim() !== "" && doc.href !== "";
}

export function isCertificationComplete(certification: ICertification): boolean {
  // LKPP has no file upload at all — a link stands in for it (ADR-053).
  if (certification.certType === "lkpp") return certification.linkUrl.trim() !== "";
  if (certification.fileUrl === "") return false;
  if (certification.certType === "other") return certification.label.trim() !== "";
  if (certification.certType === "kemenkes") return certification.aklNumber.trim() !== "";
  if (certification.certType === "bpom") return certification.registrationNumber.trim() !== "";
  // `?? ""` because Halal rows saved before this field existed have no key.
  return (certification.certificateNumber ?? "").trim() !== "";
}

interface IProductFilesEditorProps {
  documents: IHeroDoc[];
  certifications: ICertification[];
  onDocumentsChange: (documents: IHeroDoc[]) => void;
  onCertificationsChange: (certifications: ICertification[]) => void;
}

export function ProductFilesEditor({
  documents,
  certifications,
  onDocumentsChange,
  onCertificationsChange,
}: IProductFilesEditorProps) {
  const updateDocument = (index: number, next: IHeroDoc) => {
    onDocumentsChange(documents.map((doc, i) => (i === index ? next : doc)));
  };

  const updateCertification = (index: number, next: ICertification) => {
    onCertificationsChange(certifications.map((item, i) => (i === index ? next : item)));
  };

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h4 className="text-sm font-semibold">Downloadable Documents</h4>
          <p className="text-muted-foreground text-xs">
            Brochures and spec sheets, offered as download buttons in the page hero.
          </p>
        </div>

        {documents.length > 0 && (
          <div className="flex flex-col gap-2">
            {/* Column headings once, above the list, rather than a Label per
                row — a Label on every row pushes that row's upload buttons
                down while the title input and action buttons beside them
                stay put, breaking the row's alignment. */}
            <div className="flex items-center gap-4 px-1">
              <span className="text-muted-foreground min-w-32 flex-1 text-xs font-medium">Name</span>
              <span className="text-muted-foreground max-w-48 flex-1 text-xs font-medium">File</span>
              <span className="text-muted-foreground max-w-48 flex-1 text-xs font-medium">Thumbnail</span>
              <span className="w-[84px] shrink-0" aria-hidden="true" />
            </div>
            {documents.map((doc, index) => (
              <div key={doc.id ?? index} className="flex items-center gap-4">
                <Input
                  value={doc.title}
                  onChange={(event) => updateDocument(index, { ...doc, title: event.target.value })}
                  maxLength={MAX_HERO_DOC_TITLE_LENGTH}
                  placeholder="Document name"
                  className="min-w-32 flex-1"
                />
                <div className="flex-1 max-w-48">
                  <UploadField
                    kind="file"
                    value={doc.href}
                    onChange={(value) => updateDocument(index, { ...doc, href: (value as string) ?? "" })}
                  />
                </div>
                <div className="flex-1 max-w-48">
                  {/* No preview box — just a compact "choose file"-style
                      button (same as the file field above); viewing what's
                      currently uploaded is the Eye button below, not an
                      inline image. */}
                  <UploadField
                    kind="image"
                    preview={false}
                    value={doc.thumbnailUrl}
                    onChange={(value) => updateDocument(index, { ...doc, thumbnailUrl: (value as string) ?? "" })}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`View document ${index + 1}`}
                    disabled={!doc.href}
                    onClick={() => window.open(doc.href, "_blank", "noopener,noreferrer")}
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`View thumbnail ${index + 1}`}
                    disabled={!doc.thumbnailUrl}
                    onClick={() => window.open(doc.thumbnailUrl, "_blank", "noopener,noreferrer")}
                  >
                    <ImageIcon className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove document ${index + 1}`}
                    onClick={() => onDocumentsChange(documents.filter((_, i) => i !== index))}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => onDocumentsChange([...documents, { id: crypto.randomUUID(), title: "", href: "" }])}
        >
          Add document <Plus className="size-4" />
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h4 className="text-sm font-semibold">Certifications</h4>
          <p className="text-muted-foreground text-xs">
            Certification badges shown under the hero. Halal, Kemenkes, and BPOM use their own fixed logo and label.
          </p>
        </div>

        {certifications.length > 0 && (
          <div className="flex flex-col gap-2">
            {certifications.map((certification, index) => (
              <div key={certification.id ?? index} className="flex items-center gap-4">
                {/* Fixed once chosen at add-time. The three styles are a
                    discriminated union with different keys, so switching in
                    place would mean discarding the row's contents anyway —
                    removing and re-adding says that plainly. */}
                <span className="text-black w-40 shrink-0 text-sm">
                  {getCertificationTypeLabel(certification.certType)}
                </span>

                {certification.certType === "other" && (
                  <Input
                    value={certification.label}
                    onChange={(event) => updateCertification(index, { ...certification, label: event.target.value })}
                    placeholder="Certification name"
                    className="min-w-32 flex-1"
                  />
                )}

                {certification.certType === "kemenkes" && (
                  <Input
                    value={certification.aklNumber}
                    onChange={(event) => updateCertification(index, { ...certification, aklNumber: event.target.value })}
                    placeholder="AKL number"
                    className="min-w-32 flex-1"
                  />
                )}

                {certification.certType === "bpom" && (
                  <Input
                    value={certification.registrationNumber}
                    onChange={(event) =>
                      updateCertification(index, { ...certification, registrationNumber: event.target.value })
                    }
                    placeholder="Registration number"
                    className="min-w-32 flex-1"
                  />
                )}

                {certification.certType === "halal" && (
                  <Input
                    // `?? ""` keeps the input controlled for Halal rows saved
                    // before this field existed.
                    value={certification.certificateNumber ?? ""}
                    onChange={(event) =>
                      updateCertification(index, { ...certification, certificateNumber: event.target.value })
                    }
                    placeholder="Certificate number"
                    className="min-w-32 flex-1"
                  />
                )}

                {certification.certType === "lkpp" && (
                  <Input
                    type="url"
                    value={certification.linkUrl}
                    onChange={(event) => updateCertification(index, { ...certification, linkUrl: event.target.value })}
                    placeholder="https://..."
                    className="min-w-32 flex-1"
                  />
                )}

                {/* LKPP has no certificate upload at all — a link stands in
                    for it (ADR-053), so this column only renders for every
                    other style. */}
                {certification.certType !== "lkpp" && (
                  <div className="flex-1 max-w-48">
                    <UploadField
                      kind="file"
                      value={certification.fileUrl}
                      onChange={(value) => updateCertification(index, { ...certification, fileUrl: (value as string) ?? "" })}
                    />
                  </div>
                )}
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`View certificate ${index + 1}`}
                    disabled={certification.certType === "lkpp" ? !certification.linkUrl : !certification.fileUrl}
                    onClick={() =>
                      window.open(
                        certification.certType === "lkpp" ? certification.linkUrl : certification.fileUrl,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    <Eye className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove certification ${index + 1}`}
                    onClick={() => onCertificationsChange(certifications.filter((_, i) => i !== index))}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Style is chosen before the row exists rather than defaulting to one
            and making the admin correct it — the three have different shapes,
            so picking up front avoids adding a row just to change its type. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-fit">
              Add certification <Plus className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {CERTIFICATION_TYPES.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => onCertificationsChange([...certifications, createCertification(option.value)])}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </section>
    </div>
  );
}
