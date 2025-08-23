import { z } from "zod";

const schemaSignIn = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const schemaSignUp = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  phone: z.string().min(5, "Номер телефона обязателен"), // 👈 required
});

type SchemaSignIn = z.infer<typeof schemaSignIn>;
type SchemaSignUp = z.infer<typeof schemaSignUp>;

export { schemaSignIn, schemaSignUp, type SchemaSignIn, type SchemaSignUp };
