import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Creates a Supabase client bound to the current request's cookies.
 *
 * Always call `await createClient()` per request — never share a client
 * across requests.
 *
 * setAll silently swallows write errors when called from a Server Component
 * (cookies are read-only there). Session refreshes must be handled by
 * middleware; see middleware.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component render — cookies are read-only here.
            // Middleware must handle token refresh writes.
          }
        },
      },
    }
  );
}

/**
 * Creates a Supabase client using the service role key.
 * Only call this from trusted server-side contexts (cron jobs, webhooks,
 * admin API routes). Never expose this client to the browser.
 */
export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
