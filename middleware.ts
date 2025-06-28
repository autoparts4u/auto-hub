import { NextResponse } from "next/server"
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // const token = await getToken({
  //   req,
  //   secret: process.env.AUTH_SECRET,
  //   cookieName: "authjs.session-token", // 👈 это важно!
  // });

  console.log("🧠 Token from middleware:", req.nextUrl.pathname);
  // const pathname = req.nextUrl.pathname;

  // // Если пользователь не авторизован — пускаем только на публичные страницы
  // if (!token) {
  //   if (pathname === "/" || pathname.startsWith("/sign-in")) {
  //     return NextResponse.next();
  //   }
  //   return NextResponse.redirect(new URL("/sign-in", req.url));
  // }

  // // Если пользователь зашел на "/", делаем redirect по роли
  // if (pathname === "/") {
  //   if (token.role === "admin") {
  //     return NextResponse.redirect(new URL("/dashboard", req.url));
  //   }
  //   if (token.role === "user") {
  //     return NextResponse.redirect(new URL("/shop", req.url));
  //   }
  // }

  return NextResponse.next();
}

// Применяем middleware ко всем страницам
export const config = {
  matcher: ["/", "/dashboard/:path*", "/shop/:path*"],
};