-- AlterTable
ALTER TABLE "_ProductToTag" ADD CONSTRAINT "_ProductToTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ProductToTag_AB_unique";

-- CreateTable
CREATE TABLE "HomeCarousel" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "size" TEXT NOT NULL DEFAULT 'md',
    "showSeeMore" BOOLEAN NOT NULL DEFAULT true,
    "categoryId" TEXT,
    "title" TEXT,
    "seeMoreUrl" TEXT,
    "items" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeCarousel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeCarousel_categoryId_idx" ON "HomeCarousel"("categoryId");

-- AddForeignKey
ALTER TABLE "HomeCarousel" ADD CONSTRAINT "HomeCarousel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
