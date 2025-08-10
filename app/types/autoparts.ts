import { Auto, Autoparts, Brands, Categories } from "@prisma/client";

export type WarehouseStock = {
  warehouseId: number;
  warehouseName: string;
  quantity: number;
};

export type AutopartWithStock = Pick<
  Autoparts,
  "id" | "article" | "description"
> & {
  category: Categories;
  brand: Brands;
  auto: Auto | null;
  totalQuantity: number;
  warehouses: WarehouseStock[];
  prices: {
    priceType: {
      id: number;
      name: string;
    };
    price: number;
  }[];
  analogues: {
    id: string;
    article: string;
    description: string;
    brand: Brands;
    category: Categories;
  }[];
};
