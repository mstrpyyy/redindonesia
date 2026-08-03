-- CreateTable
CREATE TABLE "ArticlesPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bannerXlUrl" TEXT,
    "bannerMdUrl" TEXT,
    "bannerSmUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticlesPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleriesPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bannerXlUrl" TEXT,
    "bannerMdUrl" TEXT,
    "bannerSmUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleriesPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticlesPage_slug_key" ON "ArticlesPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GalleriesPage_slug_key" ON "GalleriesPage"("slug");
