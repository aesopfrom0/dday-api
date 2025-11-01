-- CreateEnum
CREATE TYPE "MoodType" AS ENUM ('HAPPY', 'EXCITED', 'SLEEPY', 'HUNGRY');

-- CreateTable
CREATE TABLE "Hello" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL DEFAULT '안녕하세요!',
    "mood" "MoodType" NOT NULL DEFAULT 'HAPPY',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hello_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bye" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL DEFAULT '안녕히 가세요!',
    "mood" "MoodType" NOT NULL DEFAULT 'EXCITED',
    "waveCount" INTEGER NOT NULL DEFAULT 1,
    "helloId" INTEGER NOT NULL,

    CONSTRAINT "Bye_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bye_helloId_idx" ON "Bye"("helloId");

-- AddForeignKey
ALTER TABLE "Bye" ADD CONSTRAINT "Bye_helloId_fkey" FOREIGN KEY ("helloId") REFERENCES "Hello"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
