import { DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: "admin" | "user";
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: "admin" | "user";
    };
  }

  interface JWT {
    role?: "admin" | "user";
  }
}