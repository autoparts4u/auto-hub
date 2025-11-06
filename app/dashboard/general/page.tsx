// app/dashboard/general/page.tsx
import db from "@/lib/db/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandsPanel } from "@/components/general/BrandsPanel";
import { CategoriesPanel } from "@/components/general/CategoriesPanel";
import { WarehousesPanel } from "@/components/general/WarehousesPanel";
import { PriceTypesPanel } from "@/components/general/PriceTypesPanel";
import { AutosPanel } from "@/components/general/AutoPanel";
import { EngineVolumesPanel } from "@/components/general/EngineVolumesPanel";
import { TextsForSearchPanel } from "@/components/general/TextsForSearchPanel";
import { OrderStatusesPanel } from "@/components/general/OrderStatusesPanel";
import { DeliveryMethodsPanel } from "@/components/general/DeliveryMethodsPanel";

export default async function GeneralPage() {
  const [
    brands,
    categories,
    warehouses,
    priceTypes,
    autos,
    engineVolumes,
    textsForSearch,
    orderStatuses,
    deliveryMethods
  ] = await Promise.all([
    db.brands.findMany(),
    db.categories.findMany(),
    db.warehouses.findMany(),
    db.priceTypes.findMany(),
    db.auto.findMany(),
    db.engineVolume.findMany(),
    db.textForAuthopartsSearch.findMany(),
    db.orderStatuses.findMany({ orderBy: { id: 'asc' } }),
    db.deliveryMethods.findMany({ orderBy: { id: 'asc' } })
  ]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Справочники</h1>
      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="brands">Бренды</TabsTrigger>
          <TabsTrigger value="categories">Группы</TabsTrigger>
          <TabsTrigger value="auto">Авто</TabsTrigger>
          <TabsTrigger value="engine-volumes">Объем двигателя</TabsTrigger>
          <TabsTrigger value="texts-for-search">Текст Поиска</TabsTrigger>
          <TabsTrigger value="warehouses">Базы</TabsTrigger>
          <TabsTrigger value="price-types">типЦ</TabsTrigger>
          <TabsTrigger value="order-statuses">Статусы заказов</TabsTrigger>
          <TabsTrigger value="delivery-methods">Методы доставки</TabsTrigger>
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
        <TabsContent value="engine-volumes">
          <EngineVolumesPanel engineVolumes={engineVolumes} />
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
        <TabsContent value="order-statuses">
          <OrderStatusesPanel orderStatuses={orderStatuses} />
        </TabsContent>
        <TabsContent value="delivery-methods">
          <DeliveryMethodsPanel deliveryMethods={deliveryMethods} />
        </TabsContent>
      </Tabs>
    </div>
  );
}