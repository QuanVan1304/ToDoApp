-- CreateEnum
CREATE TYPE "AgentActionType" AS ENUM ('DELETE_TASK');

-- CreateTable
CREATE TABLE "PendingAgentAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingAgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingAgentAction_userId_type_idx" ON "PendingAgentAction"("userId", "type");

-- CreateIndex
CREATE INDEX "PendingAgentAction_expiresAt_idx" ON "PendingAgentAction"("expiresAt");

-- AddForeignKey
ALTER TABLE "PendingAgentAction" ADD CONSTRAINT "PendingAgentAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
