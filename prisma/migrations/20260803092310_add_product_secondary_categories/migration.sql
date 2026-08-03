-- CreateTable
CREATE TABLE "_ProductSecondaryCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductSecondaryCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProductSecondaryCategories_B_index" ON "_ProductSecondaryCategories"("B");

-- AddForeignKey
ALTER TABLE "_ProductSecondaryCategories" ADD CONSTRAINT "_ProductSecondaryCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductSecondaryCategories" ADD CONSTRAINT "_ProductSecondaryCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
