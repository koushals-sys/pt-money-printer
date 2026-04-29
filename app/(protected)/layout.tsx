import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    console.log("[protected-layout] SUPABASE_URL set:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("[protected-layout] ANON_KEY set:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    console.log("[protected-layout] user:", user ? user.id : "null", "error:", error?.message ?? "none");

    if (!user) {
      redirect("/login");
    }
  } catch (err) {
    console.error("[protected-layout] error:", err);
    redirect("/login");
  }

  return <>{children}</>;
}
