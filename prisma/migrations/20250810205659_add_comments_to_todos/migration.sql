-- AlterTable
ALTER TABLE "public"."comments" ADD COLUMN     "todoId" TEXT,
ALTER COLUMN "postId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "comments_todoId_idx" ON "public"."comments"("todoId");

-- AddForeignKey
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "public"."todos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

