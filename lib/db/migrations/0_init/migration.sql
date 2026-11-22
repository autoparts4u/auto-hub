-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('active', 'cancelled', 'expired', 'converted');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Analogues" (
    "id" SERIAL NOT NULL,
    "partAId" TEXT NOT NULL,
    "partBId" TEXT NOT NULL,

    CONSTRAINT "Analogues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "defaultOrderStatusId" INTEGER,
    "defaultDeliveryMethodId" INTEGER,
    "defaultPurchaseStatusId" INTEGER,
    "usdRateOffset" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservationDurationMinutes" INTEGER NOT NULL DEFAULT 1440,
    "tickerText" TEXT,
    "dbAccessEnabled" BOOLEAN NOT NULL DEFAULT true,
    "duressPin" TEXT NOT NULL DEFAULT '1234',
    "pinCode" TEXT NOT NULL DEFAULT '0000',

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateTable
CREATE TABLE "Auto" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Auto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutopartLog" (
    "id" TEXT NOT NULL,
    "autopartId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutopartLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutopartPrices" (
    "autopart_id" TEXT NOT NULL,
    "pricesType_id" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AutopartPrices_pkey" PRIMARY KEY ("autopart_id","pricesType_id")
);

-- CreateTable
CREATE TABLE "Autoparts" (
    "id" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brand_id" INTEGER,
    "category_id" INTEGER,
    "text_for_search_id" INTEGER,
    "maxNumberShown" INTEGER NOT NULL DEFAULT 5,
    "year_from" INTEGER,
    "year_to" INTEGER,
    "fuel_type_id" INTEGER,
    "invisible" BOOLEAN NOT NULL DEFAULT false,
    "shortDescription" TEXT,

    CONSTRAINT "Autoparts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutopartsAutos" (
    "autopart_id" TEXT NOT NULL,
    "auto_id" INTEGER NOT NULL,

    CONSTRAINT "AutopartsAutos_pkey" PRIMARY KEY ("autopart_id","auto_id")
);

-- CreateTable
CREATE TABLE "AutopartsEngineVolumes" (
    "autopart_id" TEXT NOT NULL,
    "engine_volume_id" INTEGER NOT NULL,

    CONSTRAINT "AutopartsEngineVolumes_pkey" PRIMARY KEY ("autopart_id","engine_volume_id")
);

-- CreateTable
CREATE TABLE "AutopartsWarehouses" (
    "autopart_id" TEXT NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "AutopartsWarehouses_pkey" PRIMARY KEY ("autopart_id","warehouse_id")
);

-- CreateTable
CREATE TABLE "Brands" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT,
    "priceAccessId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "warehouseAccessId" INTEGER,
    "reservationDurationMinutes" INTEGER,

    CONSTRAINT "Clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientsDeliveryMethods" (
    "client_id" TEXT NOT NULL,
    "deliveryMethod_id" INTEGER NOT NULL,

    CONSTRAINT "ClientsDeliveryMethods_pkey" PRIMARY KEY ("client_id","deliveryMethod_id")
);

-- CreateTable
CREATE TABLE "DashboardSnooze" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "snoozedBy_userId" TEXT NOT NULL,
    "snoozedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardSnooze_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryMethods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "hexColor" TEXT,

    CONSTRAINT "DeliveryMethods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineVolume" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EngineVolume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "FuelType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItems" (
    "id" SERIAL NOT NULL,
    "order_id" TEXT NOT NULL,
    "autopart_id" TEXT,
    "warehouse_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "item_final_price" DOUBLE PRECISION NOT NULL,
    "article" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pickedAt" TIMESTAMP(3),
    "pickedBy_userId" TEXT,

    CONSTRAINT "OrderItems_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "OrderStatuses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "hexColor" TEXT NOT NULL,
    "isLast" BOOLEAN NOT NULL,

    CONSTRAINT "OrderStatuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id" TEXT NOT NULL,
    "deliveryMethod_id" INTEGER,
    "client_id" TEXT NOT NULL,
    "orderStatus_id" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "deliveryAddress" TEXT,
    "trackingNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cancelledAt" TIMESTAMP(3),
    "handoverNote" TEXT,
    "scheduledHandoverAt" TIMESTAMP(3),

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceTypes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "PriceTypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItems" (
    "id" SERIAL NOT NULL,
    "purchaseOrder_id" TEXT NOT NULL,
    "autopart_id" TEXT,
    "warehouse_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "purchase_price" DOUBLE PRECISION NOT NULL,
    "article" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "PurchaseOrderItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrders" (
    "id" TEXT NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "purchaseStatus_id" INTEGER NOT NULL,
    "expectedAt" TIMESTAMP(3),

    CONSTRAINT "PurchaseOrders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseStatuses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "hexColor" TEXT NOT NULL,
    "isLast" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseStatuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDeliveryLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservations" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "autopart_id" TEXT NOT NULL,
    "warehouse_id" INTEGER,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnItems" (
    "id" SERIAL NOT NULL,
    "return_id" TEXT NOT NULL,
    "order_item_id" INTEGER,
    "autopart_id" TEXT,
    "warehouse_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "article" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ReturnItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnStatuses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "hexColor" TEXT NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReturnStatuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Returns" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "returnStatus_id" INTEGER NOT NULL,
    "reason" TEXT,
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdBy_userId" TEXT,
    "client_id" TEXT,

    CONSTRAINT "Returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "Suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TextForAuthopartsSearch" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "TextForAuthopartsSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'user',
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "name" TEXT,
    "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivityEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserActivitySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "city" TEXT,
    "country" TEXT,

    CONSTRAINT "UserActivitySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Warehouses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "Warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check" (
    "id" SERIAL NOT NULL,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Analogues_partAId_partBId_key" ON "Analogues"("partAId" ASC, "partBId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Auto_name_key" ON "Auto"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Autoparts_article_key" ON "Autoparts"("article" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Brands_name_key" ON "Brands"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Categories_name_key" ON "Categories"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Clients_phone_key" ON "Clients"("phone" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardSnooze_entityType_entityId_key" ON "DashboardSnooze"("entityType" ASC, "entityId" ASC);

-- CreateIndex
CREATE INDEX "DashboardSnooze_snoozedUntil_idx" ON "DashboardSnooze"("snoozedUntil" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "EngineVolume_name_key" ON "EngineVolume"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FuelType_name_key" ON "FuelType"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PushDeliveryLog_entityType_entityId_kind_userId_key" ON "PushDeliveryLog"("entityType" ASC, "entityId" ASC, "kind" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "PushDeliveryLog_sentAt_idx" ON "PushDeliveryLog"("sentAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint" ASC);

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId" ASC);

-- CreateIndex
CREATE INDEX "Reservations_autopart_id_idx" ON "Reservations"("autopart_id" ASC);

-- CreateIndex
CREATE INDEX "Reservations_client_id_idx" ON "Reservations"("client_id" ASC);

-- CreateIndex
CREATE INDEX "Reservations_expiresAt_idx" ON "Reservations"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "Reservations_status_idx" ON "Reservations"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_clientId_key" ON "User"("clientId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);

-- CreateIndex
CREATE INDEX "UserActivityEvent_createdAt_idx" ON "UserActivityEvent"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "UserActivityEvent_sessionId_idx" ON "UserActivityEvent"("sessionId" ASC);

-- CreateIndex
CREATE INDEX "UserActivitySession_startedAt_idx" ON "UserActivitySession"("startedAt" ASC);

-- CreateIndex
CREATE INDEX "UserActivitySession_userId_idx" ON "UserActivitySession"("userId" ASC);

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analogues" ADD CONSTRAINT "Analogues_partAId_fkey" FOREIGN KEY ("partAId") REFERENCES "Autoparts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analogues" ADD CONSTRAINT "Analogues_partBId_fkey" FOREIGN KEY ("partBId") REFERENCES "Autoparts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_defaultDeliveryMethodId_fkey" FOREIGN KEY ("defaultDeliveryMethodId") REFERENCES "DeliveryMethods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_defaultOrderStatusId_fkey" FOREIGN KEY ("defaultOrderStatusId") REFERENCES "OrderStatuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppSettings" ADD CONSTRAINT "AppSettings_defaultPurchaseStatusId_fkey" FOREIGN KEY ("defaultPurchaseStatusId") REFERENCES "PurchaseStatuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopartLog" ADD CONSTRAINT "AutopartLog_autopartId_fkey" FOREIGN KEY ("autopartId") REFERENCES "Autoparts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopartPrices" ADD CONSTRAINT "AutopartPrices_autopart_id_fkey" FOREIGN KEY ("autopart_id") REFERENCES "Autoparts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopartPrices" ADD CONSTRAINT "AutopartPrices_pricesType_id_fkey" FOREIGN KEY ("pricesType_id") REFERENCES "PriceTypes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Autoparts" ADD CONSTRAINT "Autoparts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Autoparts" ADD CONSTRAINT "Autoparts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Autoparts" ADD CONSTRAINT "Autoparts_fuel_type_id_fkey" FOREIGN KEY ("fuel_type_id") REFERENCES "FuelType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Autoparts" ADD CONSTRAINT "Autoparts_text_for_search_id_fkey" FOREIGN KEY ("text_for_search_id") REFERENCES "TextForAuthopartsSearch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopartsAutos" ADD CONSTRAINT "AutopartsAutos_auto_id_fkey" FOREIGN KEY ("auto_id") REFERENCES "Auto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopartsAutos" ADD CONSTRAINT "AutopartsAutos_autopart_id_fkey" FOREIGN KEY ("autopart_id") REFERENCES "Autoparts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopartsEngineVolumes" ADD CONSTRAINT "AutopartsEngineVolumes_autopart_id_fkey" FOREIGN KEY ("autopart_id") REFERENCES "Autoparts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopartsEngineVolumes" ADD CONSTRAINT "AutopartsEngineVolumes_engine_volume_id_fkey" FOREIGN KEY ("engine_volume_id") REFERENCES "EngineVolume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopartsWarehouses" ADD CONSTRAINT "AutopartsWarehouses_autopart_id_fkey" FOREIGN KEY ("autopart_id") REFERENCES "Autoparts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutopartsWarehouses" ADD CONSTRAINT "AutopartsWarehouses_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clients" ADD CONSTRAINT "Clients_priceAccessId_fkey" FOREIGN KEY ("priceAccessId") REFERENCES "PriceTypes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clients" ADD CONSTRAINT "Clients_warehouseAccessId_fkey" FOREIGN KEY ("warehouseAccessId") REFERENCES "Warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientsDeliveryMethods" ADD CONSTRAINT "ClientsDeliveryMethods_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientsDeliveryMethods" ADD CONSTRAINT "ClientsDeliveryMethods_deliveryMethod_id_fkey" FOREIGN KEY ("deliveryMethod_id") REFERENCES "DeliveryMethods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardSnooze" ADD CONSTRAINT "DashboardSnooze_snoozedBy_userId_fkey" FOREIGN KEY ("snoozedBy_userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_autopart_id_fkey" FOREIGN KEY ("autopart_id") REFERENCES "Autoparts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_pickedBy_userId_fkey" FOREIGN KEY ("pickedBy_userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderStatus_id_fkey" FOREIGN KEY ("orderStatus_id") REFERENCES "OrderStatuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_deliveryMethod_id_fkey" FOREIGN KEY ("deliveryMethod_id") REFERENCES "DeliveryMethods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_orderStatus_id_fkey" FOREIGN KEY ("orderStatus_id") REFERENCES "OrderStatuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItems" ADD CONSTRAINT "PurchaseOrderItems_autopart_id_fkey" FOREIGN KEY ("autopart_id") REFERENCES "Autoparts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItems" ADD CONSTRAINT "PurchaseOrderItems_purchaseOrder_id_fkey" FOREIGN KEY ("purchaseOrder_id") REFERENCES "PurchaseOrders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItems" ADD CONSTRAINT "PurchaseOrderItems_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrders" ADD CONSTRAINT "PurchaseOrders_purchaseStatus_id_fkey" FOREIGN KEY ("purchaseStatus_id") REFERENCES "PurchaseStatuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrders" ADD CONSTRAINT "PurchaseOrders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDeliveryLog" ADD CONSTRAINT "PushDeliveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservations" ADD CONSTRAINT "Reservations_autopart_id_fkey" FOREIGN KEY ("autopart_id") REFERENCES "Autoparts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservations" ADD CONSTRAINT "Reservations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservations" ADD CONSTRAINT "Reservations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItems" ADD CONSTRAINT "ReturnItems_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "OrderItems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItems" ADD CONSTRAINT "ReturnItems_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "Returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnItems" ADD CONSTRAINT "ReturnItems_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Returns" ADD CONSTRAINT "Returns_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Returns" ADD CONSTRAINT "Returns_createdBy_userId_fkey" FOREIGN KEY ("createdBy_userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Returns" ADD CONSTRAINT "Returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Returns" ADD CONSTRAINT "Returns_returnStatus_id_fkey" FOREIGN KEY ("returnStatus_id") REFERENCES "ReturnStatuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivityEvent" ADD CONSTRAINT "UserActivityEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserActivitySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivitySession" ADD CONSTRAINT "UserActivitySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

