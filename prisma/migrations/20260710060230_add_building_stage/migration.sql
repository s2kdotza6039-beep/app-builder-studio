/*
  Warnings:

  - You are about to drop the column `file_name` on the `project_files` table. All the data in the column will be lost.
  - You are about to drop the column `file_type` on the `project_files` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `project_routes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[project_id,file_path]` on the table `project_files` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "project_files_project_id_idx";

-- AlterTable
ALTER TABLE "project_files" DROP COLUMN "file_name",
DROP COLUMN "file_type",
ALTER COLUMN "language" SET DEFAULT 'text';

-- AlterTable
ALTER TABLE "project_routes" DROP COLUMN "code";

-- CreateTable
CREATE TABLE "project_versions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "label" TEXT,
    "instruction" TEXT,
    "files_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_versions_project_id_version_number_key" ON "project_versions"("project_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "project_files_project_id_file_path_key" ON "project_files"("project_id", "file_path");

-- AddForeignKey
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
