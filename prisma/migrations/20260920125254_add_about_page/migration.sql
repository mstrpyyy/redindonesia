-- CreateTable
CREATE TABLE "AboutPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bannerXlUrl" TEXT,
    "bannerXlVideoUrl" TEXT,
    "bannerMdUrl" TEXT,
    "bannerMdVideoUrl" TEXT,
    "bannerSmUrl" TEXT,
    "bannerSmVideoUrl" TEXT,
    "bannerVideoUseForSmaller" BOOLEAN NOT NULL DEFAULT false,
    "whoIconUrl" TEXT,
    "whoBody" TEXT,
    "whoImages" JSONB NOT NULL DEFAULT '[]',
    "videos" JSONB NOT NULL DEFAULT '[]',
    "whatIconUrl" TEXT,
    "whatBody" TEXT,
    "workIconUrl" TEXT,
    "workBody" TEXT,
    "workCards" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AboutPage_slug_key" ON "AboutPage"("slug");

-- Seed the row with the page's pre-CMS copy so /about looks unchanged after
-- it's wired to this table. The admin can edit everything from here on.
INSERT INTO "AboutPage" (
    "id", "slug",
    "bannerXlUrl", "bannerMdUrl", "bannerSmUrl",
    "whoIconUrl", "whoBody", "whoImages",
    "videos",
    "whatIconUrl", "whatBody",
    "workIconUrl", "workBody", "workCards",
    "updatedAt"
) VALUES (
    'about-page-our-story', 'our-story',
    '/image/about/about-banner-xl.webp', '/image/about/about-banner-md.webp', '/image/about/about-banner-sm.webp',
    '/image/about/red-who-icon.webp',
    $body$<p>Radian Elok Distriversa, or commonly known as RED Indonesia, was founded in 2004 with a bold mission: to provide Indonesian practitioners with the highest quality technology and the best medical innovations available globally.</p><p>Recognizing the profound expertise of local clinicians, we were driven by a commitment to empower their artistry with advanced technological precision. We didn't just want to be a trading company; we wanted to redefine the industry.</p><p>Today, that vision is a reality as we partner with many of the world's leading brands from Europe and the USA, bringing premier medical aesthetic solutions directly to the Indonesian market.</p>$body$,
    '[{"id":"who-1","image":"/image/about/who-1.webp"},{"id":"who-2","image":"/image/about/who-2.webp"},{"id":"who-3","image":"/image/about/who-3.webp"},{"id":"who-4","image":"/image/about/who-4.webp"},{"id":"who-5","image":"/image/about/who-5.webp"},{"id":"who-6","image":"/image/about/who-6.webp"}]'::jsonb,
    $videos$[{"id":"video-1","youtubeUrl":"https://www.youtube.com/watch?v=O2o8r9zxD40","thumbnailUrl":"/image/about/about-banner-xl.webp","heading":"Our Mission in Motion","description":"Discover how we've partnered with global leaders to bring premier medical aesthetic solutions directly to Indonesia, redefining what's possible for local clinicians"}]$videos$::jsonb,
    '/image/about/red-what-icon.webp',
    $body$<p>At RED Indonesia, we believe that world-class clinical results are born from the perfect synergy between a practitioner's skill and the technology they wield. We don't just supply equipment; we cultivate long-term partnerships dedicated to elevating the standards of medical aesthetics in Indonesia.</p><p>For 22 years, we have acted as a bridge, scouring the globe for "Gold Standard" brands that are clinically proven, not just trendy. We collaborate with the world's leading brands to maintain the highest possible product quality and comprehensive after-sales service.</p><p>Think of us as a partner rather than a resource. We share your perspective and work together to achieve your clinical and professional goals.</p>$body$,
    '/image/about/red-work-icon.webp',
    $body$<p>At RED Indonesia, we believe great technology is only half the battle, the other half is expertise. When you partner with us, you gain two decades of clinical knowledge and a team dedicated to your success. We provide the infrastructure and services your practice demands.</p>$body$,
    $cards$[{"id":"card-1","icon":"users","title":"PROFESSIONAL TRAINING TEAM","description":"We provide comprehensive clinical training and courses to equip your staff with the technical mastery required to optimize the full potential of our machines and products."},{"id":"card-2","icon":"wrench","title":"SERVICE DEPARTMENT","description":"To ensure uninterrupted clinic operations, we provide ongoing after-sales service for all equipment, even after the warranty period has expired."},{"id":"card-3","icon":"shield-check","title":"PRODUCT WARRANTY","description":"All equipment and devices provided by us come with a one-year warranty that fully covers any manufacturing technical defects to protect your investment."}]$cards$::jsonb,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;
