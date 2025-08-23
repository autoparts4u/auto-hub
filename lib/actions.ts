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

      const res = await db.user.create({
        data: {
          email: validatedData.email.toLocaleLowerCase(),
          password: hashedPassword,
          phone: validatedData.phone,
        },
      });

      console.log(res.email)
    },
    successMessage: "Signed up successfully",
  });
};

export { signUp };