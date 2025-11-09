import { DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: "admin" | "user";
    isConfirmed: boolean;
    clientId: string;
    client?: {
      id: string;
      name: string;
      phone: string | null;
    };
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: "admin" | "user";
      isConfirmed: boolean;
      clientId: string;
      client: {
        id: string;
        name: string;
        phone: string | null;
      };
    };
  }

  interface JWT {
    role?: "admin" | "user";
    isConfirmed?: boolean;
    clientId?: string;
  }
}