-- AlterTable
ALTER TABLE "HomePage" DROP COLUMN "bannerLgVideoUseForSmaller",
DROP COLUMN "bannerMdVideoUseForSmaller",
DROP COLUMN "bannerXlVideoUseForSmaller",
ADD COLUMN     "bannerVideoUseForSmaller" BOOLEAN NOT NULL DEFAULT false;
