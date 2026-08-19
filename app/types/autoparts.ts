import { Auto, Autoparts, Brands, Categories, EngineVolume, FuelType, TextForAuthopartsSearch } from "@prisma/client";

export type WarehouseStock = {
  warehouseId: number;
  warehouseName: string;
  quantity: number;
};

export type AutopartWithStock = Pick<
  Autoparts,
  "id" | "article" | "description" | "maxNumberShown" | "year_from" | "year_to" | "invisible"
> & {
  category: Categories | null;
  brand: Brands | null;
  fuelType: FuelType | null;
  autos: Auto[];
  engineVolumes: EngineVolume[];
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
    invisible: boolean;
    brand: Brands | null;
    category: Categories | null;
  }[];
};

export type AutopartFormData = {
  article: string;
  description: string;
  maxNumberShown: number;
  invisible: boolean;
  brandId: number;
  categoryId: number;
  autoIds: number[];
  engineVolumeIds: number[];
  yearFrom?: number;
  yearTo?: number;
  textForSearchId?: number;
  fuelTypeId?: number;
  stock: {
    warehouseId: number;
    quantity: number;
  }[];
  analogueIds: string[];
};
