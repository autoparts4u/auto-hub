import bcrypt from "bcryptjs";

import { schemaSignUp } from "@/lib/schema";
import db from "@/lib/db/db";
import { executeAction } from "@/lib/executeAction";

const signUp = async (formData: FormData) => {
  return executeAction({
    actionFn: async () => {
      const email = formData.get("email");
      const password = formData.get("password");
      const phone = formData.get("phone");

      const validatedData = schemaSignUp.parse({ email, password, phone });

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Проверяем существующего клиента по phone
      const existingClient = await db.clients.findFirst({
        where: {
          phone: validatedData.phone,
          user: null, // Клиент еще не связан с пользователем
        },
      });

      let client;

      if (existingClient) {
        // Используем существующего клиента (созданного админом)
        client = existingClient;
        console.log(`✅ Найден существующий клиент: ${client.name}`);
      } else {
        // Создаём нового клиента
        client = await db.clients.create({
          data: {
            name: validatedData.email.split('@')[0], // Используем часть email как имя
            fullName: validatedData.email,
            phone: validatedData.phone,
          },
        });
        console.log(`✨ Создан новый клиент для ${validatedData.email}`);
      }

      // Создаём пользователя, связанного с клиентом
      const res = await db.user.create({
        data: {
          email: validatedData.email.toLocaleLowerCase(),
          password: hashedPassword,
          clientId: client.id, // Связываем с клиентом
        },
        include: {
          client: true,
        },
      });

      console.log(`User created: ${res.email}, linked to client: ${res.client.name}`)
    },
    successMessage: "Signed up successfully",
  });
};

export { signUp };