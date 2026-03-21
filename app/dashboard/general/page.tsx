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
import { FuelTypesPanel } from "@/components/general/FuelTypesPanel";
import { OrderDefaultsPanel } from "@/components/general/OrderDefaultsPanel";
import PurchaseStatusesPanel from "@/components/purchases/PurchaseStatusesPanel";

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
    deliveryMethods,
    fuelTypes
  ] = await Promise.all([
    db.brands.findMany({ orderBy: { name: 'asc' } }),
    db.categories.findMany({ orderBy: { name: 'asc' } }),
    db.warehouses.findMany({ orderBy: { name: 'asc' } }),
    db.priceTypes.findMany({ orderBy: { name: 'asc' } }),
    db.auto.findMany({ orderBy: { name: 'asc' } }),
    db.engineVolume.findMany({ orderBy: { name: 'asc' } }),
    db.textForAuthopartsSearch.findMany({ orderBy: { text: 'asc' } }),
    db.orderStatuses.findMany({ orderBy: { id: 'asc' } }),
    db.deliveryMethods.findMany({ orderBy: { id: 'asc' } }),
    db.fuelType.findMany({ orderBy: { name: 'asc' } })
  ]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Справочники</h1>
      <Tabs defaultValue="brands" className="w-full">
        <div className="mb-4 space-y-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Запчасти</p>
            <TabsList className="inline-flex flex-wrap h-auto w-auto">
              <TabsTrigger value="brands" className="whitespace-nowrap">Бренды</TabsTrigger>
              <TabsTrigger value="categories" className="whitespace-nowrap">Группы</TabsTrigger>
              <TabsTrigger value="auto" className="whitespace-nowrap">Авто</TabsTrigger>
              <TabsTrigger value="fuel-types" className="whitespace-nowrap">Виды топлива</TabsTrigger>
              <TabsTrigger value="engine-volumes" className="whitespace-nowrap">Объём двигателя</TabsTrigger>
              <TabsTrigger value="warehouses" className="whitespace-nowrap">Склады</TabsTrigger>
              <TabsTrigger value="price-types" className="whitespace-nowrap">Типы цен</TabsTrigger>
              <TabsTrigger value="texts-for-search" className="whitespace-nowrap">Текст поиска</TabsTrigger>
            </TabsList>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Заказы</p>
            <TabsList className="inline-flex flex-wrap h-auto w-auto">
              <TabsTrigger value="order-statuses" className="whitespace-nowrap">Статусы заказов</TabsTrigger>
              <TabsTrigger value="purchase-statuses" className="whitespace-nowrap">Статусы поступлений</TabsTrigger>
              <TabsTrigger value="delivery-methods" className="whitespace-nowrap">Методы доставки</TabsTrigger>
              <TabsTrigger value="order-defaults" className="whitespace-nowrap">Настройки по умолчанию</TabsTrigger>
            </TabsList>
          </div>
        </div>

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
        <TabsContent value="fuel-types">
          <FuelTypesPanel fuelTypes={fuelTypes} />
        </TabsContent>
        <TabsContent value="purchase-statuses">
          <PurchaseStatusesPanel />
        </TabsContent>
        <TabsContent value="order-defaults">
          <OrderDefaultsPanel orderStatuses={orderStatuses} deliveryMethods={deliveryMethods} />
        </TabsContent>
      </Tabs>
    </div>
  );
}