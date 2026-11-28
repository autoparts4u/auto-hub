import { z } from "zod";

export const vinSchema = z.object({
  vin: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase().replace(/[\s-]/g, ""))
    .refine((value) => value.length === 17, {
      message: "VIN должен содержать 17 символов",
    })
    .refine((value) => !/[IOQ]/.test(value), {
      message: "VIN не может содержать буквы I, O и Q",
    })
    .refine((value) => /^[A-HJ-NPR-Z0-9]{17}$/.test(value), {
      message: "VIN содержит недопустимые символы",
    }),
});
