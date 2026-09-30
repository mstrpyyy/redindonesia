import { HeroBannerGroup } from "@/app/(user)/components/HeroBannerGroup";
import { resolveDigitalBannerVideoUrls } from "@/lib/digital";
import type { IDigitalItem } from "@/interfaces/digital";
import { MediaBlockButton } from "./media-block-button";

// Reuses `HeroBannerGroup` unchanged (the same responsive Sm/Md/Lg/Xl
// image+video picker the catalogue Product/Category hero uses) for the
// full-bleed background, then lays its own two gradient overlays on top
// instead of the catalogue hero's own overlay set — this page's reference
// design calls for a starker, more literal "image fades to solid black"
// treatment than the catalogue hero's subtle vignette (see ADR-110):
// bottom-anchored on narrow screens (image on top, black below), left-
// anchored on md+ (image on the right, black panel on the left).
export function DigitalItemHero({ item }: { item: IDigitalItem }) {
  const bannerXlUrl = item.bannerXlUrl ?? "";
  const bannerVideoUrls = resolveDigitalBannerVideoUrls(item);

  return (
    <section className="relative min-h-svh w-full overflow-hidden bg-black">
      {bannerXlUrl && (
        <HeroBannerGroup
          slots={[
            {
              key: "sm",
              imageUrl: item.bannerSmUrl,
              videoUrl: bannerVideoUrls.Sm,
              fallbackImageUrl: bannerXlUrl,
              imageAlt: item.name,
              className: "object-cover object-center z-0 hidden portrait:block portrait:md:hidden absolute inset-0 size-full",
            },
            {
              key: "md",
              imageUrl: item.bannerMdUrl,
              videoUrl: bannerVideoUrls.Md,
              fallbackImageUrl: bannerXlUrl,
              imageAlt: item.name,
              className: "object-cover object-center z-0 hidden portrait:md:block absolute inset-0 size-full",
            },
            {
              key: "lg",
              imageUrl: item.bannerLgUrl,
              videoUrl: bannerVideoUrls.Lg,
              fallbackImageUrl: bannerXlUrl,
              imageAlt: item.name,
              className: "object-cover object-center z-0 hidden landscape:block landscape:xl:hidden absolute inset-0 size-full",
            },
            {
              key: "xl",
              imageUrl: bannerXlUrl,
              videoUrl: bannerVideoUrls.Xl,
              fallbackImageUrl: bannerXlUrl,
              imageAlt: item.name,
              className: "object-cover object-center z-0 hidden landscape:xl:block absolute inset-0 size-full",
            },
          ]}
        />
      )}

      {/* <md: image on top, fading to solid black beneath it. */}
      <div className="absolute inset-x-0 bottom-0 z-10 h-2/3 bg-linear-to-t from-black from-30% to-transparent md:hidden" />
      {/* >=md: image on the right, fading to a solid black panel on the left. */}
      <div className="absolute inset-0 z-10 hidden bg-linear-to-r from-black from-45% to-transparent md:block" />

      {/* `justify-start` + explicit top padding, not `justify-center` — a
          centered flex box only looks centered while its content is shorter
          than the viewport; once the button grid grows tall (several large
          button images), "centered" content that already fills the height
          reads as flush against the top edge instead. Fixed top padding
          keeps the heading's position predictable regardless of how much
          media content follows it. */}
      <div className="relative z-20 flex min-h-svh flex-col justify-end gap-8 px-6 pt-[42vh] pb-12 md:max-w-2xl md:justify-start md:px-16 md:pt-24 md:pb-20 lg:max-w-3xl lg:px-24 lg:pt-28">
        <h1 className="h1-format text-balance text-white">{item.name}</h1>

        {item.media.length > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-6">
            {item.media.map((block) => (
              <MediaBlockButton key={block.id} block={block} itemSlug={item.slug} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
