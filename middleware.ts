import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (!pathname.startsWith('/api/auth')) {
    try {
      const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } })
      const result = await sql`SELECT "dbAccessEnabled" FROM "AppSettings" WHERE id = 1 LIMIT 1`
      const dbEnabled = result[0]?.dbAccessEnabled ?? true

      if (!dbEnabled) {
        if (pathname.startsWith('/api/')) {
          return new NextResponse(JSON.stringify({ error: 'Service unavailable' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new NextResponse(
          '<!DOCTYPE html><html><head><title>Service Unavailable</title></head><body><h1>503 — Service Unavailable</h1><p>The service is temporarily unavailable. Please try again later.</p></body></html>',
          {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
          }
        )
      }
    } catch {
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/shop/:path*", "/api/:path*"],
}
