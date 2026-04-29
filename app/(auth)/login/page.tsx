"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 justify-center mb-8">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_18px_rgba(59,130,246,0.55)]">
          <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-heading font-bold text-[17px]">
          <span className="text-white">Spry</span>
          <span className="text-blue-400"> Health</span>
        </span>
      </div>

      <div className="bg-[#0a0e1a] border border-white/[0.07] rounded-2xl p-8">
        <h1 className="font-heading font-semibold text-[20px] text-slate-100 mb-1">
          Sign in
        </h1>
        <p className="text-[13px] text-slate-500 mb-6">
          Access your referral dashboard
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-slate-400 mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@clinic.com"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-slate-400 mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-[13px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_18px_rgba(59,130,246,0.3)] transition-all duration-150 mt-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="text-center text-[12px] text-slate-600 mt-5">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
