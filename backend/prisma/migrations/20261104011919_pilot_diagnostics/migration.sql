-- CreateEnum
CREATE TYPE "AttemptPhase" AS ENUM ('PRACTICE', 'BASELINE', 'POSTTEST');

-- AlterTable
ALTER TABLE "attempts" ADD COLUMN     "phase" "AttemptPhase" NOT NULL DEFAULT 'PRACTICE';

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "is_diagnostic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "sus_responses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "answers" INTEGER[],
    "score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sus_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sus_responses_user_id_key" ON "sus_responses"("user_id");

-- AddForeignKey
ALTER TABLE "sus_responses" ADD CONSTRAINT "sus_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
