-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dailyGoal" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ADD COLUMN     "targetCategory" TEXT;
