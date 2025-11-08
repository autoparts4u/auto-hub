-- Fix typo: authopart -> autopart
-- Rename columns in OrderItems table
ALTER TABLE "OrderItems" RENAME COLUMN "authopart_id" TO "autopart_id";

-- Rename columns in AutopartsWarehouses table
ALTER TABLE "AutopartsWarehouses" RENAME COLUMN "authopart_id" TO "autopart_id";

-- Rename columns in AutopartPrices table
ALTER TABLE "AutopartPrices" RENAME COLUMN "authopart_id" TO "autopart_id";



