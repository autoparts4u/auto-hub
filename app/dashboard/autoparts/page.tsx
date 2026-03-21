"use client";

import { useEffect, useState } from "react";
import { AutopartsTable } from "@/components/autoparts/AutopartsTable";
import { AutopartWithStock } from "@/app/types/autoparts";
import { Auto, Brands, Categories, EngineVolume, FuelType, TextForAuthopartsSearch, Warehouses } from "@prisma/client";
import AutopartsLoading from "./loading";

interface PageData {
  parts: AutopartWithStock[];
  brands: Brands[];
  warehouses: Warehouses[];
  categories: Categories[];
  autos: Auto[];
  engineVolumes: EngineVolume[];
  textsForSearch: TextForAuthopartsSearch[];
  fuelTypes: FuelType[];
}

export default function PartsPage() {
  const [data, setData] = useState<PageData | null>(null);

  useEffect(() => {
    fetch("/api/autoparts/full")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <AutopartsLoading />;

  return (
    <AutopartsTable
      parts={data.parts}
      brands={data.brands}
      categories={data.categories}
      autos={data.autos}
      engineVolumes={data.engineVolumes}
      warehouses={data.warehouses}
      textsForSearch={data.textsForSearch}
      fuelTypes={data.fuelTypes}
    />
  );
}
