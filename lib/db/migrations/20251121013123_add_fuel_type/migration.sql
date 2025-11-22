-- CreateTable
CREATE TABLE "FuelType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FuelType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FuelType_name_key" ON "FuelType"("name");

-- AlterTable
ALTER TABLE "Autoparts" ADD COLUMN "fuel_type_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Autoparts" ADD CONSTRAINT "Autoparts_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "FuelType"("id") ON DELETE SET NULL ON UPDATE CASCADE;


