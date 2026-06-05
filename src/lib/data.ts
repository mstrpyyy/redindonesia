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
          {
            name: "BDR",
            slug: "bdr",
          },
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
          {
            name: "LABORATORIOS TEGOR",
            slug: "laboratorios-tegor",
          },
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
    slug: '/registration-documentation',
  },
  {
    name: 'Warranty & Service',
    slug: '/warranty-service',
  },
  {
    name: 'Marcom & Promotion',
    slug: '/marcom-promotion',
  },
  {
    name: 'Career',
    slug: '/career',
  },
]

export const navMenus = [
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
    type: 'link'
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

export const almaCarouselList = [
  {
    img: '/image/home/alma-showcase/300ppi/Alma Duo.webp',
    title: 'Alma Duo',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/alma-showcase/300ppi/Alma Harmony.webp',
    title: 'Alma Harmony',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/alma-showcase/300ppi/Alma Hybrid.webp',
    title: 'Alma Hybrid',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/alma-showcase/300ppi/Alma PrimeX.webp',
    title: 'Alma PrimeX',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/alma-showcase/300ppi/ALMA-Q.webp',
    title: 'Alma Q',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/alma-showcase/300ppi/Soprano Titanium Special Edition.webp',
    title: 'Soprano Titanium Special Edition',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/alma-showcase/300ppi/Soprano Titanium.webp',
    title: 'Soprano Titanium',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
]

export const innoCarouselList = [
  {
    img: '/image/home/inno-showcase/INNO CE BIDENS.webp',
    title: 'INNO CE-BIDENS',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/inno-showcase/INNO CE MESHA DEEP.webp',
    title: 'INNO CE MESHA Deep',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/inno-showcase/INNO CE MESHA ESSENCE.webp',
    title: 'INNO CE MESHA Essence',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/inno-showcase/INNO CE MESHA INTENSE.webp',
    title: 'INNO CE MESHA Intense',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/inno-showcase/INNO CE MESHA SCARS.webp',
    title: 'INNO CE MESHA Scars',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/inno-showcase/INNO CE MESHA SMILE.webp',
    title: 'INNO CE MESHA Smile',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
  {
    img: '/image/home/inno-showcase/INNO CE MOIST.webp',
    title: 'INNO CE Moist',
    href: 'devices/medical-aesthetics/alma-laser/alma-harmony',
  },
]

