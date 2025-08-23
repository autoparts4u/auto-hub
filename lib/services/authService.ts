import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export class AuthService {
  static async registerUser(data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    address?: string;
  }) {
    const { email, password, name, phone, address } = data;

    // 1. Проверяем, нет ли уже пользователя с таким email
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Пользователь с таким email уже существует.");
    }

    // 2. Хэшируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Создаём нового пользователя
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        address,
        isConfirmed: false, // например: подтверждение email в будущем
      },
    });

    return user;
  }

  static async validateCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    const isPasswordValid = user.password && await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Неверный пароль");
    }

    return user;
  }
}
