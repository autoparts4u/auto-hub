import { DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: "admin" | "user";
    phone: string | null;
    isConfirmed: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: "admin" | "user";
      phone: string | null;
      isConfirmed: boolean;
    };
  }

  interface JWT {
    role?: "admin" | "user";
  }
}