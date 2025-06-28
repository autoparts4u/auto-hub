import { z } from "zod";

export const signUpSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: "Email обязателен" })
      .email({ message: "Некорректный формат email" }),
    password: z
      .string()
      .min(6, { message: "Пароль должен быть не менее 6 символов" }),
    confirmPassword: z.string(),
    name: z.string().min(1, { message: "Имя обязательно" }),
    phone: z
      .string()
      .regex(/^[0-9+\-\s()]{6,20}$/, {
        message: "Введите корректный номер телефона",
      }),
    address: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Пароли не совпадают",
  });
