"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Loader2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SignupPayload } from "@/app/api/auth/signup/route";
import { cn } from "@/lib/utils";

type Tab = "manual" | "npi";

interface NPIResult {
  name: string;
  clinicName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  npiNumber: string;
}

async function lookupNPI(npi: string): Promise<NPIResult | null> {
  try {
    const res = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${npi.trim()}`
    );
    const data = await res.json();
    const r = data?.results?.[0];
    if (!r) return null;

    const loc = r.addresses?.find((a: { address_purpose: string }) => a.address_purpose === "LOCATION") ?? r.addresses?.[0];
    const basic = r.basic ?? {};
    const taxonomy = r.taxonomies?.find((t: { primary: boolean }) => t.primary) ?? r.taxonomies?.[0];

    // Type 1 = individual (PT themselves), Type 2 = organization
    const isOrg = r.enumeration_type === "NPI-2";
    const fullName = isOrg
      ? basic.organization_name ?? ""
      : `${basic.first_name ?? ""} ${basic.last_name ?? ""}`.trim();

    return {
      name: fullName,
      clinicName: isOrg ? fullName : (taxonomy?.desc ?? "Physical Therapy Clinic"),
      address: loc?.address_1 ?? "",
      city: loc?.city ?? "",
      state: loc?.state ?? "",
      zip: (loc?.postal_code ?? "").slice(0, 5),
      npiNumber: npi.trim(),
    };
  } catch {
    return null;
  }
}

// ─── Shared input style ────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all disabled:opacity-50";

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("manual");

  // NPI lookup state
  const [npiInput, setNpiInput] = useState("");
  const [npiLoading, setNpiLoading] = useState(false);
  const [npiResult, setNpiResult] = useState<NPIResult | null>(null);
  const [npiError, setNpiError] = useState<string | null>(null);

  // Form fields (shared across both tabs after NPI pre-fill)
  const [name, setName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Submission state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleNPILookup() {
    if (!npiInput.trim()) return;
    setNpiLoading(true);
    setNpiError(null);
    setNpiResult(null);

    const result = await lookupNPI(npiInput);
    if (!result) {
      setNpiError("NPI not found. Check the number and try again.");
    } else {
      setNpiResult(result);
      setName(result.name);
      setClinicName(result.clinicName);
      setAddress(result.address);
      setCity(result.city);
      setState(result.state);
      setZip(result.zip);
    }
    setNpiLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: SignupPayload = {
      email,
      password,
      name,
      clinicName,
      city,
      state,
      zip,
      address,
      npiNumber: tab === "npi" ? npiInput.trim() : undefined,
    };

    // Create DB rows via service role API
    let res: Response;
    let json: { error?: string; clinicId?: string };
    try {
      res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      json = await res.json();
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setError(json.error ?? "Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    // Sign in to get a session
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Account created but sign-in failed: " + signInError.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  const npiPrefilled = tab === "npi" && npiResult !== null;
  const showForm = tab === "manual" || npiPrefilled;

  return (
    <div className="w-full max-w-[460px]">
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
          Create your account
        </h1>
        <p className="text-[13px] text-slate-500 mb-6">
          Start finding referral partners for your clinic
        </p>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl mb-6">
          {(["manual", "npi"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null); }}
              className={cn(
                "flex-1 py-2 text-[12px] font-semibold rounded-lg transition-all duration-150",
                tab === t
                  ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {t === "manual" ? "Manual setup" : "Use NPI number"}
            </button>
          ))}
        </div>

        {/* NPI lookup */}
        {tab === "npi" && !npiPrefilled && (
          <div className="space-y-4">
            <p className="text-[12px] text-slate-500">
              Enter your 10-digit NPI number to auto-fill your clinic details.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={npiInput}
                onChange={(e) => setNpiInput(e.target.value)}
                placeholder="1234567890"
                maxLength={10}
                className={inputCls}
                onKeyDown={(e) => e.key === "Enter" && handleNPILookup()}
              />
              <button
                type="button"
                onClick={handleNPILookup}
                disabled={npiLoading || npiInput.length < 10}
                className="flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
              >
                {npiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                Look up
              </button>
            </div>
            {npiError && (
              <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {npiError}
              </p>
            )}
            <p className="text-[11px] text-slate-600">
              Don&apos;t have an NPI?{" "}
              <button
                type="button"
                onClick={() => setTab("manual")}
                className="text-blue-400 hover:text-blue-300"
              >
                Set up manually
              </button>
            </p>
          </div>
        )}

        {/* Pre-fill confirmation */}
        {npiPrefilled && (
          <div className="flex items-start justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-5">
            <div>
              <p className="text-[12px] font-semibold text-blue-300 mb-0.5">
                NPI {npiInput} matched
              </p>
              <p className="text-[12px] text-slate-400">
                {npiResult!.clinicName} — {npiResult!.city}, {npiResult!.state}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setNpiResult(null);
                setName(""); setClinicName(""); setCity(""); setState(""); setZip(""); setAddress("");
              }}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors shrink-0 ml-4"
            >
              Change
            </button>
          </div>
        )}

        {/* Main form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-slate-400 mb-1.5 block">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Alex Johnson"
                  disabled={npiPrefilled}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-slate-400 mb-1.5 block">
                  Clinic name
                </label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  required
                  placeholder="Sunrise PT"
                  disabled={npiPrefilled}
                  className={inputCls}
                />
              </div>
            </div>

            {!npiPrefilled && (
              <>
                <div>
                  <label className="text-[12px] font-medium text-slate-400 mb-1.5 block">
                    Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-2">
                    <label className="text-[12px] font-medium text-slate-400 mb-1.5 block">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      placeholder="Austin"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-slate-400 mb-1.5 block">
                      State
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      className={inputCls}
                    >
                      <option value="">— State —</option>
                      {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[12px] font-medium text-slate-400 mb-1.5 block">
                      ZIP
                    </label>
                    <input
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="78701"
                      maxLength={5}
                      className={inputCls}
                    />
                  </div>
                </div>
              </>
            )}

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
                className={inputCls}
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
                minLength={8}
                placeholder="Min. 8 characters"
                className={inputCls}
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
              Create account
            </button>
          </form>
        )}

        <p className="text-center text-[12px] text-slate-600 mt-5">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
