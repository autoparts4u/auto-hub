import { Autoparts, Brands, Categories } from "@prisma/client";

export type WarehouseStock = {
  warehouseId: number;
  warehouseName: string;
  quantity: number;
};

export type AutopartWithStock = Pick<
  Autoparts,
  "id" | "article" | "description"
> & {
  category: Categories
  brand: Brands;
  totalQuantity: number;
  warehouses: WarehouseStock[];
  prices: {
    priceType: {
      id: number;
      name: string;
    };
    price: number;
  }[];
};
