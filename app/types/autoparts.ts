import { Auto, Autoparts, Brands, Categories, TextForAuthopartsSearch } from "@prisma/client";

export type WarehouseStock = {
  warehouseId: number;
  warehouseName: string;
  quantity: number;
};

export type AutopartWithStock = Pick<
  Autoparts,
  "id" | "article" | "description" | "maxNumberShown"
> & {
  category: Categories | null;
  brand: Brands | null;
  auto: Auto | null;
  textForSearch: TextForAuthopartsSearch | null;
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
    brand: Brands | null;
    category: Categories | null;
  }[];
};

export type AutopartFormData = {
  article: string;
  description: string;
  maxNumberShown: number;
  brandId: number;
  categoryId: number;
  autoId: number;
  textForSearchId?: number;
  stock: {
    warehouseId: number;
    quantity: number;
  }[];
  analogueIds: string[];
};
