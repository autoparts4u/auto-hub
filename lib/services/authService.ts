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

    // 3. Ищем существующего клиента по phone (созданного админом)
    const existingClient = await prisma.clients.findFirst({
      where: {
        phone: phone,
        user: null, // Клиент еще не связан с пользователем
      },
    });

    let client;

    if (existingClient) {
      // 5a. Используем существующего клиента, созданного админом
      // Оставляем name и fullName клиента как есть (это бизнес-название)
      // Дополняем только недостающие данные
      client = await prisma.clients.update({
        where: { id: existingClient.id },
        data: {
          address: address || existingClient.address,
          // name и fullName НЕ обновляем - оставляем то, что указал админ
        },
      });
      console.log(`✅ Пользователь ${email} связан с существующим клиентом ${client.name}`);
    } else {
      // 5b. Создаём нового клиента
      client = await prisma.clients.create({
        data: {
          name: name,
          fullName: name,
          phone: phone,
          address: address,
        },
      });
      console.log(`✨ Создан новый клиент ${name} для пользователя ${email}`);
    }

    // 6. Создаём пользователя, связанного с клиентом
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isConfirmed: false,
        clientId: client.id, // Связываем с клиентом
      },
      include: {
        client: true, // Включаем данные клиента в ответ
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
