-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "bannerLgVideoUrl" TEXT,
ADD COLUMN     "bannerMdVideoUrl" TEXT,
ADD COLUMN     "bannerSmVideoUrl" TEXT,
ADD COLUMN     "bannerVideoUseForSmaller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bannerXlVideoUrl" TEXT;
