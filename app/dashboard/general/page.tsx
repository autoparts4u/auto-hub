// app/dashboard/general/page.tsx
import db from "@/lib/db/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandsPanel } from "@/components/general/BrandsPanel";
import { CategoriesPanel } from "@/components/general/CategoriesPanel";
import { WarehousesPanel } from "@/components/general/WarehousesPanel";
import { PriceTypesPanel } from "@/components/general/PriceTypesPanel";

export default async function GeneralPage() {
  const [brands, categories, warehouses, priceTypes] = await Promise.all([
    db.brands.findMany(),
    db.categories.findMany(),
    db.warehouses.findMany(),
    db.priceTypes.findMany(),
  ]);

  console.log(priceTypes);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Общие справочники</h1>
      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="brands">Бренды</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="warehouses">Склады</TabsTrigger>
          <TabsTrigger value="price-types">Типы цен</TabsTrigger>
        </TabsList>

        <TabsContent value="brands">
          <BrandsPanel brands={brands} />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesPanel categories={categories} />
        </TabsContent>
        <TabsContent value="warehouses">
          <WarehousesPanel warehouses={warehouses} />
        </TabsContent>
        <TabsContent value="price-types">
          <PriceTypesPanel initialPriceTypes={priceTypes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}