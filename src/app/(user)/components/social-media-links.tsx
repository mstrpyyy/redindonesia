import { LinkedinOutlinedRounded, TiktokOutlinedRounded } from '@lineiconshq/react-lineicons'
import { Facebook, Instagram, Linkedin } from 'lucide-react'

// Shared by `Footer` (icon + text) and `TrustLists`' `SocialMediaList` (icon
// only) — same accounts/links either way, not the admin-managed
// `SocialAccount` list (that one only backs the Marcom & Promotion page's own
// showcase, ADR-080).
// WARNING! CHANGE PACKAGE
export const SOCIAL_MEDIA_LINKS = [
  {
    icon: <Instagram />,
    href: 'https://www.instagram.com/radian.elok.distriversa/',
    text: '@radian.elok.distriversa'
  },
  {
    icon: <Facebook />,
    href: 'https://www.facebook.com/radianelok/',
    text: 'PT. Radian Elok Distriversa'
  },
  {
    icon: <Linkedin />,
    href: 'https://www.instagram.com/radian.elok.distriversa/',
    text: 'PT. Radian Elok Distriversa'
  },
  {
    icon: <TiktokOutlinedRounded />,
    href: 'https://www.facebook.com/radianelok/',
    text: '@radianelok'
  }
]
