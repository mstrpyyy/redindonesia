-- CreateTable
CREATE TABLE "DigitalItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'hidden',
    "order" INTEGER NOT NULL DEFAULT 0,
    "qrImageUrl" TEXT NOT NULL,
    "bannerSmUrl" TEXT,
    "bannerSmVideoUrl" TEXT,
    "bannerMdUrl" TEXT,
    "bannerMdVideoUrl" TEXT,
    "bannerLgUrl" TEXT,
    "bannerLgVideoUrl" TEXT,
    "bannerXlUrl" TEXT,
    "bannerXlVideoUrl" TEXT,
    "bannerVideoUseForSmaller" BOOLEAN NOT NULL DEFAULT false,
    "media" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigitalItem_slug_key" ON "DigitalItem"("slug");

-- CreateIndex
CREATE INDEX "DigitalItem_status_idx" ON "DigitalItem"("status");
