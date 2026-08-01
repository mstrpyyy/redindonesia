// White/black variants of each fixed certification style's logo (ADR-049) —
// picked at render time to match the hero's own black/white contrast
// (ADR-048), the same way `HERO_TEXT_COLORS` pairs a title color with a
// contrast color. Shared by the admin editor (seeds a new certification's
// `imageUrl` with the white variant, matching the previous fixed look) and
// the public hero (`ProductPageView.tsx`, picks white or black per hero).

export interface ICertificationLogoPair {
  white: string;
  black: string;
}

// All three now have a genuine white/black monochrome pair (ADR-049).
export const CERTIFICATION_LOGOS: Record<"halal" | "kemenkes" | "bpom", ICertificationLogoPair> = {
  halal: { white: "/image/logo-halal-notext-white.png", black: "/image/logo-halal-notext-black.png" },
  kemenkes: { white: "/image/kemenkes-white.png", black: "/image/kemenkes-black.png" },
  bpom: { white: "/image/bpom-white.png", black: "/image/bpom-black.png" },
};
