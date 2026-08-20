"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type HeroBreakpointKey = "sm" | "md" | "lg" | "xl";

// Mirrors the exact CSS rules each slot's own `hidden portrait:...`/
// `hidden landscape:...` className already uses to decide which one is
// visually shown (Tailwind defaults: `md` = 768px, `xl` = 1280px) — kept in
// sync with those classes below. This is only used to decide which slot is
// allowed to *fetch* a video; the CSS classes alone still control what's
// visually displayed, independent of JS/hydration timing.
const BREAKPOINT_QUERIES: Record<HeroBreakpointKey, string> = {
  sm: "(orientation: portrait) and (max-width: 767.98px)",
  md: "(orientation: portrait) and (min-width: 768px)",
  lg: "(orientation: landscape) and (max-width: 1279.98px)",
  xl: "(orientation: landscape) and (min-width: 1280px)",
};

// `null` until the client has resolved a match (first paint, before
// hydration runs) — every slot treats `null` the same as "not active", so no
// video fetches until we actually know which one is needed.
function useActiveHeroBreakpoint(): HeroBreakpointKey | null {
  const [active, setActive] = useState<HeroBreakpointKey | null>(null);

  useEffect(() => {
    const entries = (Object.keys(BREAKPOINT_QUERIES) as HeroBreakpointKey[]).map((key) => ({
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

interface IHeroBannerSlot {
  key: HeroBreakpointKey;
  imageUrl?: string | null;
  videoUrl?: string | null;
  fallbackImageUrl: string;
  className: string;
  imageAlt: string;
}

// One slot per breakpoint. `isActive` gates whether the video is even
// mounted — an inactive slot renders only the still image (its `videoUrl`,
// if any, is ignored) so the browser never fetches a video the visitor's
// screen doesn't need. Falling back to the image also covers a video that
// fails to load/play at all (bad file, codec unsupported) via `onError`.
function HeroBannerSlot({
  imageUrl,
  videoUrl,
  fallbackImageUrl,
  imageAlt,
  className,
  isActive,
}: Omit<IHeroBannerSlot, "key"> & { isActive: boolean }) {
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
    <Image
      src={resolvedImageUrl}
      alt={imageAlt}
      fill
      priority
      unoptimized
      sizes="100vw"
      className={className}
    />
  );
}

// Shared by the homepage hero (HeroHomeSection) and the catalogue/category
// hero (HeroDevice) — see ADR-090/093. Generic over its slots so both
// four-size shapes (homepage's sm/md/lg/xl, category's own) reuse the same
// breakpoint-gated video-fetch logic instead of each re-implementing it.
export function HeroBannerGroup({ slots }: { slots: IHeroBannerSlot[] }) {
  const activeBreakpoint = useActiveHeroBreakpoint();

  return (
    <>
      {slots.map((slot) => (
        <HeroBannerSlot
          key={slot.key}
          imageUrl={slot.imageUrl}
          videoUrl={slot.videoUrl}
          fallbackImageUrl={slot.fallbackImageUrl}
          imageAlt={slot.imageAlt}
          className={slot.className}
          isActive={slot.key === activeBreakpoint}
        />
      ))}
    </>
  );
}
