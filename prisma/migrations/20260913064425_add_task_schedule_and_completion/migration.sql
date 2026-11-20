-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "scheduledFor" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");

-- CreateIndex
CREATE INDEX "Task_userId_projectId_idx" ON "Task"("userId", "projectId");

-- CreateIndex
CREATE INDEX "Task_userId_status_scheduledFor_idx" ON "Task"("userId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Task_userId_status_completedAt_idx" ON "Task"("userId", "status", "completedAt");
