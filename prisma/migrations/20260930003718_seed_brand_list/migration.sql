-- Seed the pre-CMS `brandList` (src/lib/data.ts) as real Brand rows so the
-- homepage "Meet Our Brands" marquee and About "Our Brands" grid look
-- unchanged after being wired to this table. The original static list's
-- `link: '/'` was a non-functional placeholder, not a real destination, so
-- these seed with no URL (now optional, see ADR-116) rather than carrying
-- that placeholder forward — the admin can add a real link from here on.
INSERT INTO "Brand" ("id", "name", "logo", "url", "order", "updatedAt") VALUES
    ('brand-seed-alma', 'Alma', '/image/brand-logo/alma.webp', NULL, 0, CURRENT_TIMESTAMP),
    ('brand-seed-aquaglo', 'Aquaglo', '/image/brand-logo/aquaglo.webp', NULL, 1, CURRENT_TIMESTAMP),
    ('brand-seed-inno-ce', 'Inno CE', '/image/brand-logo/inno-ce.webp', NULL, 2, CURRENT_TIMESTAMP),
    ('brand-seed-inno-exoma', 'Inno Exoma', '/image/brand-logo/inno-exoma.webp', NULL, 3, CURRENT_TIMESTAMP),
    ('brand-seed-innoaesthetics', 'Innoaesthetics', '/image/brand-logo/innoaesthetics.webp', NULL, 4, CURRENT_TIMESTAMP),
    ('brand-seed-meline', 'Meline', '/image/brand-logo/meline.webp', NULL, 5, CURRENT_TIMESTAMP),
    ('brand-seed-novuma', 'Novuma', '/image/brand-logo/novuma.webp', NULL, 6, CURRENT_TIMESTAMP),
    ('brand-seed-tegoder', 'Tegoder', '/image/brand-logo/tegoder.webp', NULL, 7, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
