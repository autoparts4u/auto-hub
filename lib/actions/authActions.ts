"use server";

import { AuthService } from "@/lib/services/authService";
import { signUpSchema } from "@/lib/validation/authSchema";

export async function register(formData: FormData) {
  try {
    const values = Object.fromEntries(formData.entries());
    const validatedData = signUpSchema.parse(values);

    await AuthService.registerUser({
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
      phone: validatedData.phone,
      address: validatedData.address,
    });

    return { success: true };
  } catch (error) {
    console.error(error);

    let errorMessage = "Ошибка регистрации";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return { success: false, message: errorMessage };
  }
}
