import type { INavbarMenu } from "@/interfaces/general";

export const deviceProductMenu = [
  {
    name: "Devices",
    slug: "devices",
    menu: [
      {
        name: "Medical Aesthetic Devices",
        slug: "medical-aesthetic-devices",
        menu: [
          {
            name: "ALMA BEAUTY",
            slug: "alma-beauty",
          },
          {
            name: "ALMA LASERS",
            slug: "alma-lasers",
            // menu: [
            //   { name: "ALMA HARMONY", slug: "alma-harmony" },
            //   { name: "SOPRANO TITANIUM SPECIAL EDITION", slug: "soprano-titanium-special-edition" },
            //   { name: "ALMA HYBRID", slug: "alma-hybrid" },
            //   { name: "HARMONY XL PRO SE", slug: "harmony-xl-pro-se" },
            //   { name: "ALMA DUO", slug: "alma-duo" },
            //   { name: "ALMA Q", slug: "alma-q" },
            //   { name: "ACCENT PRIME", slug: "accent-prime" },
            //   { name: "ALMA PRIME X", slug: "alma-prime-x" },
            //   { name: "SOPRANO ICE PLATINUM", slug: "soprano-ice-platinum" },
            //   { name: "SOPRANO TITANIUM", slug: "soprano-titanium" },
            //   { name: "PICO CLEAR", slug: "pico-clear" },
            // ],
          }          
        ],
      },
      {
        name: "Aesthetic Devices",
        slug: "aesthetic-devices",
        menu: [
          {
            name: "NUE SKIN MICRODERMABRASION",
            slug: "nue-skin-microdermabrasion",
          },
          {
            name: "AQUAGLO",
            slug: "aquaglo",
          },
          {
            name: "IONTO COMED",
            slug: "ionto-comed",
          },
          {
            name: "COCOON WELLNESS PRO",
            slug: "cocoon-wellness-pro",
          },
        ],
      },
    ],
  },
  {
    name: "Products",
    slug: "products",
    menu: [
      {
        name: "Medical Aesthetic",
        slug: "medical-aesthetic",
        menu: [
          {
            name: "INNOAESTHETICS",
            slug: "innoaesthetics",
            menu: [
              {
                name: "Professional Use",
                slug: "professional-use",
              },
              {
                name: "Home Use",
                slug: "home-use",
              },
            ],
          },
          {
            name: "MELINE",
            slug: "meline",
            menu: [
              {
                name: "Professional Use",
                slug: "professional-use",
              },
              {
                name: "Home Use",
                slug: "home-use",
              },
            ],
          },
        ],
      },
      {
        name: "Cosmeceutical",
        slug: "cosmeceutical",
        menu: [
          {
            name: "TEGODER COSMETICS",
            slug: "tegoder-cosmetics",
            menu: [
              {
                name: "TEGODER FACE",
                slug: "tegoder-face",
              },
              {
                name: "TEGODER BODY",
                slug: "tegoder-body",
              },
            ],
          },
          // {
          //   name: "BDR",
          //   slug: "bdr",
          // },
        ],
      },
      {
        name: "Injectable",
        slug: "injectable",
        menu: [
          {
            name: "Novuma-CaHa Collagen Stimulator",
            slug: "novuma-caha-collagen-stimulator",
          },
          {
            name: "INNO-CE-HA Dermal Fillers and Biorevitalizers",
            slug: "inno-ce-ha-dermal-fillers-biorevitalizers",
          },
        ],
      },
      {
        name: "Supplement",
        slug: "supplement",
        menu: [
          // {
          //   name: "LABORATORIOS TEGOR",
          //   slug: "laboratorios-tegor",
          // },
          {
            name: "INNOAESTHETICS",
            slug: "innoaesthetics",
          },
        ],
      },
    ],
  },
]

export const supportMenu = [
  {
    name: 'Registration & Documentation',
    slug: '/support/registration-documentation',
  },
  {
    name: 'Warranty & Service',
    slug: '/support/warranty-service',
  },
  {
    name: 'Marcom & Promotion',
    slug: '/support/marcom-promotion',
  },
  {
    name: 'Career',
    slug: '/support/career',
  },
]

export const mediaMenu = [
  {
    name: 'Articles',
    slug: '/media/articles',
  },
  {
    name: 'Galleries',
    slug: '/media/galleries',
  },
  {
    name: 'Podcasts',
    slug: '/media/podcasts',
  }
]

export const navMenus: INavbarMenu[] = [
  {
    name: 'Home',
    slug: '/',
    type: 'link'
  },
  {
    name: 'About',
    slug: '/about',
    type: 'link'
  },
  {
    name: 'Devices & Products',
    slug: null,
    type: 'largeDropdown',
    menu: deviceProductMenu
  },
  {
    name: 'Media',
    slug: '/media',
    type: 'smallDropdown',
    menu: mediaMenu
  },
  {
    name: 'Support',
    slug: null,
    type: 'smallDropdown',
    menu: supportMenu
  },
  {
    name: 'Contact',
    slug: '/contact',
    type: 'link'
  },
]

// One branch's live nav data, plus whether the DB read for it actually
// succeeded — the two are tracked separately (see ADR-050, refining
// ADR-044) so `buildNavMenus` can tell "the read itself failed" (fall back
// to the static placeholder — the one case that's still allowed to show
// fake data) apart from "the read succeeded and there's genuinely nothing
// there yet" (no categories created, or none qualify as a page after
// ADR-043's filtering — `menu` is legitimately `[]`, and that's shown as an
// empty branch rather than papered over with static content).
export interface ILiveCategoryBranch {
  fetchSucceeded: boolean
  menu: INavbarMenu[]
}

// Splices live (Category-backed) Devices/Products trees into the static
// `navMenus` structure (see ADR-042 — Products joined Devices here once the
// `/products/...` catch-all existed to back its links). Each branch falls
// back to its own static `deviceProductMenu` data independently — only when
// `fetchSucceeded` is false, i.e. the DB read itself errored (see ADR-050)
// — so one type's outage never blanks the other's nav.
export function buildNavMenus(devices: ILiveCategoryBranch, products: ILiveCategoryBranch) {
  return navMenus.map((menu) =>
    menu.name === 'Devices & Products'
      ? {
          ...menu,
          menu: (menu.menu ?? []).map((root) => {
            if (root.slug === 'devices') return devices.fetchSucceeded ? { ...root, menu: devices.menu } : root
            if (root.slug === 'products') return products.fetchSucceeded ? { ...root, menu: products.menu } : root
            return root
          }),
        }
      : menu
  )
}

export const brandList = [
  { src: '/image/brand-logo/alma.webp', name: 'alma', link:'/' },
  { src: '/image/brand-logo/aquaglo.webp', name: 'aquaglo', link:'/' },
  { src: '/image/brand-logo/inno-ce.webp', name: 'inno-ce', link:'/' },
  { src: '/image/brand-logo/inno-exoma.webp', name: 'inno exoma', link:'/' },
  { src: '/image/brand-logo/innoaesthetics.webp', name: 'innoaesthetics', link:'/' },
  { src: '/image/brand-logo/meline.webp', name: 'meline', link:'/' },
  { src: '/image/brand-logo/novuma.webp', name: 'novuma', link:'/' },
  { src: '/image/brand-logo/tegoder.webp', name: 'tegoder', link:'/' },
  // { src: '/image/brand2.png', name: 'almabeauty', link:'/' },
  // { src: '/image/brand3.png', name: 'aestheticbyalma', link:'/' },
  // { src: '/image/brand8.png', name: 'ionto', link:'/' },
  // { src: '/image/brand12.png', name: 'tegor', link:'/' },
]


