-- AlterTable
ALTER TABLE "ArticlesPage" ADD COLUMN     "bannerMdVideoUrl" TEXT,
ADD COLUMN     "bannerSmVideoUrl" TEXT,
ADD COLUMN     "bannerVideoUseForSmaller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bannerXlVideoUrl" TEXT;

-- AlterTable
ALTER TABLE "ContactPage" ADD COLUMN     "bannerMdVideoUrl" TEXT,
ADD COLUMN     "bannerSmVideoUrl" TEXT,
ADD COLUMN     "bannerVideoUseForSmaller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bannerXlVideoUrl" TEXT;

-- AlterTable
ALTER TABLE "GalleriesPage" ADD COLUMN     "bannerMdVideoUrl" TEXT,
ADD COLUMN     "bannerSmVideoUrl" TEXT,
ADD COLUMN     "bannerVideoUseForSmaller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bannerXlVideoUrl" TEXT;

-- AlterTable
ALTER TABLE "PodcastPage" ADD COLUMN     "bannerMdVideoUrl" TEXT,
ADD COLUMN     "bannerSmVideoUrl" TEXT,
ADD COLUMN     "bannerVideoUseForSmaller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bannerXlVideoUrl" TEXT;

-- AlterTable
ALTER TABLE "SupportPage" ADD COLUMN     "bannerMdVideoUrl" TEXT,
ADD COLUMN     "bannerSmVideoUrl" TEXT,
ADD COLUMN     "bannerVideoUseForSmaller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bannerXlVideoUrl" TEXT;
