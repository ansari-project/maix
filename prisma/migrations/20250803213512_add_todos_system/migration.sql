-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "todos" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "TodoStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "assigneeId" TEXT,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "posts" ADD COLUMN "todoId" TEXT;

-- CreateIndex
CREATE INDEX "todos_projectId_status_idx" ON "todos"("projectId", "status");

-- CreateIndex
CREATE INDEX "todos_assigneeId_status_idx" ON "todos"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "posts_todoId_idx" ON "posts"("todoId");

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "todos"("id") ON DELETE SET NULL ON UPDATE CASCADE;