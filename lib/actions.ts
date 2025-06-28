import bcrypt from "bcryptjs";

import { schema } from "@/lib/schema";
import db from "@/lib/db/db";
import { executeAction } from "@/lib/executeAction";

const signUp = async (formData: FormData) => {
  return executeAction({
    actionFn: async () => {
      const email = formData.get("email");
      const password = formData.get("password");
      const validatedData = schema.parse({ email, password });

      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      const res = await db.user.create({
        data: {
          email: validatedData.email.toLocaleLowerCase(),
          password: hashedPassword,
        },
      });

      console.log(res.email)
    },
    successMessage: "Signed up successfully",
  });
};

export { signUp };