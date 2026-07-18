-- AlterTable
ALTER TABLE "users" ADD COLUMN     "github_connected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "github_token" TEXT,
ADD COLUMN     "github_username" TEXT;
