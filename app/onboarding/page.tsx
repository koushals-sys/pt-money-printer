"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ─── Preset options ───────────────────────────────────────────────────────────

const INJURY_OPTIONS = [
  "ACL Tear",
  "Rotator Cuff",
  "Lower Back Pain",
  "Hip Replacement",
  "Sports Injuries",
  "Knee Pain",
  "Shoulder Pain",
  "Spinal Stenosis",
  "Neck Pain",
  "Ankle Sprain",
  "Wrist Fracture",
  "Post-Surgical Rehab",
  "Balance Disorders",
  "Stroke Rehab",
  "Pediatric PT",
];

const INSURANCE_OPTIONS = [
  "Medicare",
  "Medicaid",
  "Blue Cross Blue Shield",
  "Aetna",
  "Cigna",
  "UnitedHealthcare",
  "Humana",
  "Tricare",
  "Workers Comp",
  "Auto / PIP",
  "Oscar Health",
  "Molina Healthcare",
  "Self-Pay",
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function Toggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all duration-150",
        selected
          ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
          : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:border-white/[0.12] hover:text-slate-300"
      )}
    >
      {selected && <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />}
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [injuries, setInjuries] = useState<string[]>([]);
  const [insurances, setInsurances] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle<T>(arr: T[], item: T, set: (a: T[]) => void) {
    set(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]);
  }

  async function handleFinish() {
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Get current user to find their clinic_id from the users table
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("clinic_id")
      .eq("id", user.id)
      .single();

    if (userError || !userRow) {
      setError("Could not find your clinic. Please contact support.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("clinic_profiles")
      .update({
        injury_types: injuries.map((i) => i.toLowerCase()),
        insurances_accepted: insurances,
      })
      .eq("id", userRow.clinic_id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#07091a] flex flex-col items-center justify-start pt-16 px-4 pb-16">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_18px_rgba(59,130,246,0.55)]">
          <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-heading font-bold text-[17px]">
          <span className="text-white">Spry</span>
          <span className="text-blue-400"> Health</span>
        </span>
      </div>

      <div className="w-full max-w-[680px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-heading font-semibold text-[24px] text-slate-100 mb-2">
            Set up your clinic profile
          </h1>
          <p className="text-[14px] text-slate-500">
            This helps us match you with the right referral partners. You can
            always change this later in Settings.
          </p>
        </div>

        {/* Step 1: Injury types */}
        <div className="bg-[#0a0e1a] border border-white/[0.07] rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-semibold text-[15px] text-slate-100">
                Conditions you treat
              </h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Select all that apply
              </p>
            </div>
            {injuries.length > 0 && (
              <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
                {injuries.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {INJURY_OPTIONS.map((inj) => (
              <Toggle
                key={inj}
                label={inj}
                selected={injuries.includes(inj)}
                onToggle={() => toggle(injuries, inj, setInjuries)}
              />
            ))}
          </div>
        </div>

        {/* Step 2: Insurances */}
        <div className="bg-[#0a0e1a] border border-white/[0.07] rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-semibold text-[15px] text-slate-100">
                Insurance accepted
              </h2>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Helps referring providers know you accept their patients
              </p>
            </div>
            {insurances.length > 0 && (
              <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
                {insurances.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {INSURANCE_OPTIONS.map((ins) => (
              <Toggle
                key={ins}
                label={ins}
                selected={insurances.includes(ins)}
                onToggle={() => toggle(insurances, ins, setInsurances)}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleFinish}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-[14px] font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_22px_rgba(59,130,246,0.3)] transition-all duration-150"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {injuries.length === 0 && insurances.length === 0
              ? "Skip for now"
              : "Save and go to dashboard"}
          </button>
        </div>
        <p className="text-center text-[11px] text-slate-600 mt-3">
          You can update these any time from Settings
        </p>
      </div>
    </div>
  );
}
