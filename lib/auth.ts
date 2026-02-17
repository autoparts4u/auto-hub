import { v4 as uuid } from "uuid";
import bcrypt from "bcryptjs";
import { encode as defaultEncode } from "next-auth/jwt";
import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { PrismaAdapter } from "@auth/prisma-adapter";
import db from "@/lib/db/db";
import { schemaSignIn } from "./schema";

const adapter = PrismaAdapter(db);

export const authOptions: NextAuthConfig = {
  adapter,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const validatedCredentials = schemaSignIn.parse(credentials);

        const user = await db.user.findUnique({
          where: {
            email: validatedCredentials.email,
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error("Invalid credentials.");
        }

        const isPasswordValid = user.password && await bcrypt.compare(
          validatedCredentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials.");
        }

        // Convert null to undefined for TypeScript compatibility
        return {
          ...user,
          clientId: user.clientId ?? undefined,
          client: user.client ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Если вход через OAuth провайдер (Google и т.д.) - проверяем наличие клиента
      if (account?.provider !== "credentials" && user.id && user.email) {
        const existingUser = await db.user.findUnique({
          where: { id: user.id },
          include: { client: true },
        });

        // Если пользователь есть, но без клиента - создаем клиента
        if (existingUser && !existingUser.client) {
          await db.clients.create({
            data: {
              name: user.name || user.email.split("@")[0],
              fullName: user.name || user.email.split("@")[0],
              phone: null,
              user: {
                connect: { id: existingUser.id },
              },
            },
          });
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials") {
        token.credentials = true;
      }

      if (user?.role) {
        token.role = user.role;
      }

      if (user?.isConfirmed !== undefined) {
        token.isConfirmed = user.isConfirmed;
      }

      if (user?.clientId) {
        token.clientId = user.clientId;
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.role === "admin" || token?.role === "user") {
        session.user.role = token.role;
      }

      if (token?.isConfirmed !== undefined) {
        session.user.isConfirmed = Boolean(token.isConfirmed);
      }

      if (token?.sub && token?.clientId) {
        // Загружаем актуальные данные клиента из базы
        const user = await db.user.findUnique({
          where: { id: token.sub },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        });

        if (user?.client) {
          session.user.clientId = user.clientId;
          session.user.client = user.client;
        }
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Создаем клиента для нового пользователя, если его еще нет
      const existingClient = await db.clients.findFirst({
        where: {
          user: {
            id: user.id,
          },
        },
      });

      if (!existingClient) {
        await db.clients.create({
          data: {
            name: user.name || user.email?.split("@")[0] || "Новый клиент",
            fullName: user.name || user.email?.split("@")[0] || "Новый клиент",
            phone: null,
            user: {
              connect: { id: user.id },
            },
          },
        });
      }
    },
  },
  jwt: {
    encode: async function (params) {
      if (params.token?.credentials) {
        const sessionToken = uuid();

        if (!params.token.sub) {
          throw new Error("No user ID found in token");
        }

        const createdSession = await adapter?.createSession?.({
          sessionToken: sessionToken,
          userId: params.token.sub,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        if (!createdSession) {
          throw new Error("Failed to create session");
        }

        return sessionToken;
      }
      return defaultEncode(params);
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
