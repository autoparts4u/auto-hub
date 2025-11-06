-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "orderStatus_id" INTEGER NOT NULL,
    "userId" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- AlterTable Orders - Add new fields
ALTER TABLE "Orders" ADD COLUMN "userId" TEXT;
ALTER TABLE "Orders" ADD COLUMN "totalAmount" DOUBLE PRECISION;
ALTER TABLE "Orders" ADD COLUMN "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Orders" ADD COLUMN "notes" TEXT;
ALTER TABLE "Orders" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "Orders" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "Orders" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable OrderItems - Add article and description, make authopart_id optional
ALTER TABLE "OrderItems" ADD COLUMN "article" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OrderItems" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "OrderItems" ALTER COLUMN "authopart_id" DROP NOT NULL;

-- Update existing OrderItems with article and description from linked autoparts
UPDATE "OrderItems" oi
SET 
    "article" = a.article,
    "description" = a.description
FROM "Autoparts" a
WHERE oi.authopart_id = a.id;

-- AddForeignKey for OrderStatusHistory
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_order_id_fkey" 
    FOREIGN KEY ("order_id") REFERENCES "Orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderStatus_id_fkey" 
    FOREIGN KEY ("orderStatus_id") REFERENCES "OrderStatuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey for Orders userId
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old constraint and add new one for OrderItems with onDelete: SetNull
ALTER TABLE "OrderItems" DROP CONSTRAINT IF EXISTS "OrderItems_authopart_id_fkey";

ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_authopart_id_fkey" 
    FOREIGN KEY ("authopart_id") REFERENCES "Autoparts"("id") ON DELETE SET NULL ON UPDATE CASCADE;



