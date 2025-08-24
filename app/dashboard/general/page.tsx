// app/dashboard/general/page.tsx
import db from "@/lib/db/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandsPanel } from "@/components/general/BrandsPanel";
import { CategoriesPanel } from "@/components/general/CategoriesPanel";
import { WarehousesPanel } from "@/components/general/WarehousesPanel";
import { PriceTypesPanel } from "@/components/general/PriceTypesPanel";
import { AutosPanel } from "@/components/general/AutoPanel";
import { TextsForSearchPanel } from "@/components/general/TextsForSearchPanel";

export default async function GeneralPage() {
  const [brands, categories, warehouses, priceTypes, autos, textsForSearch] = await Promise.all([
    db.brands.findMany(),
    db.categories.findMany(),
    db.warehouses.findMany(),
    db.priceTypes.findMany(),
    db.auto.findMany(),
    db.textForAuthopartsSearch.findMany()
  ]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Справочники</h1>
      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="brands">Бренды</TabsTrigger>
          <TabsTrigger value="categories">Группы</TabsTrigger>
          <TabsTrigger value="auto">Авто</TabsTrigger>
          <TabsTrigger value="texts-for-search">Текст Поиска</TabsTrigger>
          <TabsTrigger value="warehouses">Базы</TabsTrigger>
          <TabsTrigger value="price-types">Тип ц</TabsTrigger>
        </TabsList>

        <TabsContent value="brands">
          <BrandsPanel brands={brands} />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesPanel categories={categories} />
        </TabsContent>
        <TabsContent value="auto">
          <AutosPanel autos={autos} />
        </TabsContent>
        <TabsContent value="texts-for-search">
          <TextsForSearchPanel textsForSearch={textsForSearch} />
        </TabsContent>
        <TabsContent value="warehouses">
          <WarehousesPanel warehouses={warehouses} />
        </TabsContent>
        <TabsContent value="price-types">
          <PriceTypesPanel priceTypes={priceTypes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}