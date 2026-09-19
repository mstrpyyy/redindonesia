-- AlterTable
ALTER TABLE "HomePage" ADD COLUMN     "featureListTitle" TEXT,
ADD COLUMN     "features" JSONB NOT NULL DEFAULT '[]';
