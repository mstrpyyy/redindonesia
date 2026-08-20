// Shared by every video-capable banner (HomePage's 4-size hero, and the
// 5 static-page banners' shared 3-size shape — Articles/Galleries/Podcast/
// Support/Contact) — see ADR-089/090/091/092. Kept generic over the size key
// so both shapes reuse the same algorithm instead of each re-implementing it.

// Walks `order` largest → smallest, carrying an "active cascading video"
// forward: a size with its own video always resolves to that video and
// becomes the new active video; a size with none resolves to the active
// video when `cascadeEnabled` is true, or to `null` when it's false.
export function resolveCascadingVideoUrls<K extends string>(
  order: readonly K[],
  ownVideo: Record<K, string | null>,
  cascadeEnabled: boolean
): Record<K, string | null> {
  const resolved = {} as Record<K, string | null>;
  let activeVideo: string | null = null;

  for (const key of order) {
    if (ownVideo[key]) {
      resolved[key] = ownVideo[key];
      activeVideo = ownVideo[key];
    } else {
      resolved[key] = cascadeEnabled ? activeVideo : null;
    }
  }

  return resolved;
}

// A size's video is only ever shown alongside its own still image (the image
// becomes the required poster/fallback) — see ADR-089. Shared validation used
// both client-side (before submit) and server-side (the actual write path).
export function findMissingBannerVideoFallback(
  sizes: { label: string; imageUrl: string; videoUrl: string }[]
): string | null {
  const missing = sizes.find((size) => size.videoUrl && !size.imageUrl);
  return missing ? `Upload a fallback image for the ${missing.label} banner before adding its video.` : null;
}

// The three static-page banner sizes (Articles/Galleries/Podcast/Support/
// Contact — ADR-092), largest → smallest. HomePage's own four-size order
// lives in src/lib/home-page.ts (HOME_BANNER_SIZE_ORDER) since it's a
// distinct shape (Xl/Lg/Md/Sm, not Xl/Md/Sm).
export const PAGE_BANNER_SIZE_ORDER = ["Xl", "Md", "Sm"] as const;
export type PageBannerSizeKey = (typeof PAGE_BANNER_SIZE_ORDER)[number];

export const PAGE_BANNER_SIZE_LABELS: Record<PageBannerSizeKey, string> = {
  Xl: "1920x830",
  Md: "1080x878",
  Sm: "1080x1080",
};
