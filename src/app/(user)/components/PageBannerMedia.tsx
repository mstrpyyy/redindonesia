"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type PageBannerBreakpointKey = "sm" | "md" | "xl";

// Mirrors the exact width breakpoints PageBanner's own `className`s already
// use to decide which slot is visually shown (Tailwind defaults: `sm` =
// 640px, `lg` = 1024px) — kept in sync with those classes in PageBanner.tsx.
// Only used to decide which slot is allowed to *fetch* a video (see
// ADR-090); the CSS classes alone still control what's visually displayed,
// independent of JS/hydration timing.
const BREAKPOINT_QUERIES: Record<PageBannerBreakpointKey, string> = {
  sm: "(max-width: 639.98px)",
  md: "(min-width: 640px) and (max-width: 1023.98px)",
  xl: "(min-width: 1024px)",
};

// `null` until the client has resolved a match (first paint, before
// hydration runs) — every slot treats `null` the same as "not active", so no
// video fetches until we actually know which one is needed.
function useActivePageBannerBreakpoint(): PageBannerBreakpointKey | null {
  const [active, setActive] = useState<PageBannerBreakpointKey | null>(null);

  useEffect(() => {
    const entries = (Object.keys(BREAKPOINT_QUERIES) as PageBannerBreakpointKey[]).map((key) => ({
      key,
      mql: window.matchMedia(BREAKPOINT_QUERIES[key]),
    }));

    const recompute = () => {
      setActive(entries.find((entry) => entry.mql.matches)?.key ?? null);
    };

    recompute();
    entries.forEach((entry) => entry.mql.addEventListener("change", recompute));
    return () => {
      entries.forEach((entry) => entry.mql.removeEventListener("change", recompute));
    };
  }, []);

  return active;
}

interface IPageBannerMediaSlot {
  key: PageBannerBreakpointKey;
  imageUrl?: string | null;
  videoUrl?: string | null;
  fallbackImageUrl: string;
  className: string;
  alt: string;
}

// One slot per breakpoint. `isActive` gates whether the video is even
// mounted — an inactive slot renders only the still image (its `videoUrl`,
// if any, is ignored) so the browser never fetches a video the visitor's
// screen doesn't need — same ADR-090 pattern as the homepage hero. Falling
// back to the image also covers a video that fails to load/play at all (bad
// file, codec unsupported) via `onError`.
function PageBannerMediaSlot({
  imageUrl,
  videoUrl,
  fallbackImageUrl,
  className,
  alt,
  isActive,
}: Omit<IPageBannerMediaSlot, "key"> & { isActive: boolean }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const resolvedImageUrl = imageUrl || fallbackImageUrl;

  if (videoUrl && isActive && !videoFailed) {
    return (
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={resolvedImageUrl}
        onError={() => setVideoFailed(true)}
        className={className}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    );
  }

  return (
    // `quality={90}`, not the `next/image` default of 75 — a full-bleed
    // 100vw banner is large enough on screen that the default's extra
    // compression reads as visible softness/artifacting (same fix
    // `GalleryViewer.tsx` already applies for the same reason).
    <Image src={resolvedImageUrl} alt={alt} fill priority sizes="100vw" quality={90} className={className} />
  );
}

export function PageBannerMedia({ slots }: { slots: IPageBannerMediaSlot[] }) {
  const activeBreakpoint = useActivePageBannerBreakpoint();

  return (
    <>
      {slots.map((slot) => (
        <PageBannerMediaSlot
          key={slot.key}
          imageUrl={slot.imageUrl}
          videoUrl={slot.videoUrl}
          fallbackImageUrl={slot.fallbackImageUrl}
          className={slot.className}
          alt={slot.alt}
          isActive={slot.key === activeBreakpoint}
        />
      ))}
    </>
  );
}
