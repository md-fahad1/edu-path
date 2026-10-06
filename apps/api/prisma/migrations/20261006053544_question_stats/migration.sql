-- CreateTable
CREATE TABLE "UserQuestionStat" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "inNotebook" BOOLEAN NOT NULL DEFAULT false,
    "box" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3),
    "lastAnsweredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuestionStat_pkey" PRIMARY KEY ("userId","questionId")
);

-- CreateIndex
CREATE INDEX "UserQuestionStat_userId_inNotebook_nextReviewAt_idx" ON "UserQuestionStat"("userId", "inNotebook", "nextReviewAt");

-- AddForeignKey
ALTER TABLE "UserQuestionStat" ADD CONSTRAINT "UserQuestionStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionStat" ADD CONSTRAINT "UserQuestionStat_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
