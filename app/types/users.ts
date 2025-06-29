import { User } from "@prisma/client";

export interface UserWithPriceType extends User {
  priceAccessId: number | null;
}
