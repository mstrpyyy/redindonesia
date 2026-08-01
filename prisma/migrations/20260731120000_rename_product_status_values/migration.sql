-- Rename Product.status values: "draft" -> "hidden", "published" -> "public"
-- (see ADR-040). Existing rows are rewritten so the site's own visibility
-- queries (status = 'public') keep matching what was previously "published"
-- instead of silently unpublishing every existing item.
UPDATE "Product" SET "status" = 'hidden' WHERE "status" = 'draft';
UPDATE "Product" SET "status" = 'public' WHERE "status" = 'published';

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'hidden';
