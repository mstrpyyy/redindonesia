-- AlterTable: four banner sizes replacing the single `bannerUrl` column.
ALTER TABLE "Category" ADD COLUMN "bannerSmUrl" TEXT,
                        ADD COLUMN "bannerMdUrl" TEXT,
                        ADD COLUMN "bannerLgUrl" TEXT,
                        ADD COLUMN "bannerXlUrl" TEXT;

-- Preserve any existing banner: it was the required/primary banner, the
-- direct equivalent of the new required `bannerXlUrl`.
UPDATE "Category" SET "bannerXlUrl" = "bannerUrl" WHERE "bannerUrl" IS NOT NULL;

ALTER TABLE "Category" DROP COLUMN "bannerUrl";
