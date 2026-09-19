-- AlterTable
ALTER TABLE "HomePage" ADD COLUMN     "certificationsTitle" TEXT,
ADD COLUMN     "certifications" JSONB NOT NULL DEFAULT '[]';
