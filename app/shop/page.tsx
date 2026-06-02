// app/shop/page.tsx
import { auth } from "@/lib/auth";
import db from "@/lib/db/db";
import { AutopartsTable } from "@/components/autoparts/AutopartsTable";
import { SignOut } from "@/components/sign-out";
import { Ticker } from "@/components/general/Ticker";
import { getFullCatalog } from "@/lib/services/catalog";
import { redirect } from "next/navigation";

const ShopPage = async () => {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Один запрос пользователя со всеми нужными полями клиента (был дубль findUnique).
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      client: {
        select: {
          id: true,
          phone: true,
          name: true,
          priceAccessId: true,
          warehouseAccessId: true,
        },
      },
    },
  });

  // если нет телефона → редиректим на ввод
  if (!currentUser?.client?.phone) {
    redirect("/add-phone");
  }

  // если аккаунт не подтверждён → редиректим
  if (!session.user.isConfirmed) {
    redirect("/confirm-account");
  }

  // Каталог кэшируется (тег "autoparts"); грузим его параллельно с настройками.
  const [catalog, settings] = await Promise.all([
    getFullCatalog(),
    db.appSettings.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <div>
      <Ticker text={settings?.tickerText ?? ''} />
      <div className="p-4">
        <div className="flex justify-between">
          <h1 className="text-2xl font-bold mb-4"></h1>
          <SignOut />
        </div>
        <AutopartsTable
          parts={catalog.parts}
          brands={catalog.brands}
          warehouses={catalog.warehouses}
          categories={catalog.categories}
          autos={catalog.autos}
          engineVolumes={catalog.engineVolumes}
          textsForSearch={catalog.textsForSearch}
          fuelTypes={catalog.fuelTypes}
          onlyView={true}
          priceAccessId={currentUser.client.priceAccessId ?? null}
          warehouseAccessId={currentUser.client.warehouseAccessId ?? null}
          clientId={currentUser.client.id ?? null}
        />
      </div>
    </div>
  );
};

export default ShopPage;
