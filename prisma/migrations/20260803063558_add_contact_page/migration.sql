-- CreateTable
CREATE TABLE "ContactPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bannerXlUrl" TEXT,
    "bannerMdUrl" TEXT,
    "bannerSmUrl" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactPage_slug_key" ON "ContactPage"("slug");
