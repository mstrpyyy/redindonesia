-- CreateTable
CREATE TABLE "SupportPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bannerXlUrl" TEXT,
    "bannerMdUrl" TEXT,
    "bannerSmUrl" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportPage_slug_key" ON "SupportPage"("slug");
