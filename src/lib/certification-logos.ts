// White/black variants of each fixed certification style's logo (ADR-049) —
// picked at render time to match the hero's own black/white contrast
// (ADR-048), the same way `HERO_TEXT_COLORS` pairs a title color with a
// contrast color. Shared by the admin editor (seeds a new certification's
// `imageUrl` with the white variant, matching the previous fixed look) and
// the public hero (`ProductPageView.tsx`, picks white or black per hero).

export interface ICertificationLogoPair {
  white: string;
  black: string;
  // Full-color logo, used by the Document Highlight segment instead of the
  // hero's contrast-matched white/black pair. LKPP/"other" have none.
  original?: string;
}

// All three now have a genuine white/black monochrome pair (ADR-049). LKPP's
// pair (ADR-060) reuses the homepage Credibility section's existing assets
// — note the filenames are `lkkp*`, a pre-existing typo already relied on
// by that section (`Credibility.tsx`), not a mistake introduced here.
export const CERTIFICATION_LOGOS: Record<"halal" | "kemenkes" | "bpom" | "lkpp", ICertificationLogoPair> = {
  halal: { white: "/image/logo-halal-notext-white.png", black: "/image/logo-halal-notext-black.png", original: "/image/halal-original.png" },
  kemenkes: { white: "/image/kemenkes-white.png", black: "/image/kemenkes-black.png", original: "/image/kemenkes-original.png" },
  bpom: { white: "/image/bpom-white.png", black: "/image/bpom-black.png", original: "/image/bpom-original.png" },
  lkpp: { white: "/image/home/certificate/lkkp.png", black: "/image/home/certificate/lkkp-black.png" },
};

// Shared certType-branching helpers (ADR-059) — pulled out so the hero's
// `CertificationBadge` and the Document Highlight segment's certification
// layout (`ProductPageView.tsx`) don't each carry their own copy of the same
// switch. Only "other" has no fixed logo (a free-text style with no
// consistent mark); LKPP now has one too (ADR-060, supersedes ADR-053's "no
// logo" note) — it still links out via `linkUrl` instead of an uploaded
// `fileUrl`, which `getCertificationHref` below is unaffected by.
import type { ICertification } from "@/interfaces/segments";

export function getCertificationLogo(
  certification: ICertification,
  variant: "white" | "black" | "original"
): string | undefined {
  if (certification.certType === "other") return undefined;
  const pair = CERTIFICATION_LOGOS[certification.certType];
  if (variant === "original") return pair.original ?? pair.black;
  return pair[variant];
}

export function getCertificationSubLabel(certification: ICertification): string | undefined {
  if (certification.certType === "halal") return certification.certificateNumber;
  if (certification.certType === "kemenkes") return certification.aklNumber;
  if (certification.certType === "bpom") return certification.registrationNumber;
  return undefined;
}

export function getCertificationHref(certification: ICertification): string {
  return certification.certType === "lkpp" ? certification.linkUrl : certification.fileUrl;
}
