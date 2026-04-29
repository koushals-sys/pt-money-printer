import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (middleware) — cookie pass-through only.
 *
 * Auth redirects are handled server-side in app/(protected)/layout.tsx
 * where the full Node.js runtime and env vars are reliably available.
 * The proxy's only job here is to let Next.js propagate cookies correctly.
 */
export function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
