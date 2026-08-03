-- CreateTable
CREATE TABLE "HomePage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bannerSmUrl" TEXT,
    "bannerMdUrl" TEXT,
    "bannerLgUrl" TEXT,
    "bannerXlUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomePage_slug_key" ON "HomePage"("slug");
