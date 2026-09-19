import {
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  CircleCheckBig,
  CircleStar,
  Crown,
  Gem,
  Globe,
  GraduationCap,
  Handshake,
  Headset,
  HeartHandshake,
  Lightbulb,
  LifeBuoy,
  MapPin,
  Network,
  Package,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  ThumbsUp,
  TrendingUp,
  Truck,
  UserRoundCheck,
  UserRoundCog,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// Curated icon set for the Feature List section's icon dropdown (ADR-101).
// The DB stores the kebab-case key; this one map is read by both the admin
// picker and the public renderer, so only these icons land in the bundle.
// Adding an option later is a one-line push here.
export const FEATURE_ICONS: Record<string, LucideIcon> = {
  "badge-check": BadgeCheck,
  "shield-check": ShieldCheck,
  "circle-check-big": CircleCheckBig,
  award: Award,
  star: Star,
  sparkles: Sparkles,
  crown: Crown,
  gem: Gem,
  "thumbs-up": ThumbsUp,
  "circle-star": CircleStar,
  "heart-handshake": HeartHandshake,
  handshake: Handshake,
  users: Users,
  "user-round-check": UserRoundCheck,
  "user-round-cog": UserRoundCog,
  globe: Globe,
  network: Network,
  "map-pin": MapPin,
  "building-2": Building2,
  truck: Truck,
  package: Package,
  headset: Headset,
  "life-buoy": LifeBuoy,
  wrench: Wrench,
  "graduation-cap": GraduationCap,
  "book-open": BookOpen,
  lightbulb: Lightbulb,
  rocket: Rocket,
  "trending-up": TrendingUp,
  target: Target,
};

export const FEATURE_ICON_NAMES = Object.keys(FEATURE_ICONS);

// Fallback for a stored name no longer in the set (e.g. removed later).
export const DEFAULT_FEATURE_ICON = "badge-check";

export function resolveFeatureIcon(name: string): LucideIcon {
  return FEATURE_ICONS[name] ?? FEATURE_ICONS[DEFAULT_FEATURE_ICON];
}

// A readable label from the kebab key ("heart-handshake" → "Heart Handshake").
export function featureIconLabel(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
