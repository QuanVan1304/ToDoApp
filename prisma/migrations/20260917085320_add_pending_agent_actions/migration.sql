/*
  Warnings:

  - A unique constraint covering the columns `[userId,type]` on the table `PendingAgentAction` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `type` on the `PendingAgentAction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "PendingAgentAction_userId_type_idx";

-- AlterTable
ALTER TABLE "PendingAgentAction" DROP COLUMN "type",
ADD COLUMN     "type" "AgentActionType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PendingAgentAction_userId_type_key" ON "PendingAgentAction"("userId", "type");
