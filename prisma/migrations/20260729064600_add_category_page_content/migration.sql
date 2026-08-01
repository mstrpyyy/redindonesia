-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "body" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;
