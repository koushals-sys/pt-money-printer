"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import type { ClinicProfile } from "@/types";

// ─── Options (match onboarding) ───────────────────────────────────────────────

const INJURY_OPTIONS = [
  "ACL Tear", "Rotator Cuff", "Lower Back Pain", "Hip Replacement",
  "Sports Injuries", "Knee Pain", "Shoulder Pain", "Spinal Stenosis",
  "Neck Pain", "Ankle Sprain", "Wrist Fracture", "Post-Surgical Rehab",
  "Balance Disorders", "Stroke Rehab", "Pediatric PT",
];

const INSURANCE_OPTIONS = [
  "Medicare", "Medicaid", "Blue Cross Blue Shield", "Aetna",
  "Cigna", "UnitedHealthcare", "Humana", "Tricare",
  "Workers Comp", "Auto / PIP", "Oscar Health", "Molina Healthcare", "Self-Pay",
];

// ─── Static enrichment data ───────────────────────────────────────────────────

const EXTRA_STATS = {
  total_patients: 847,
  years_established: 8,
  referral_appointments_per_month: 34,
  phone: "(512) 555-0142",
  fax: "(512) 555-0143",
  email: "referrals@sunrisept.com",
};

const INSURANCE_CONFIG: Record<
  string,
  { abbr: string; textColor: string; bg: string; border: string }
> = {
  Aetna:                  { abbr: "Ae", textColor: "#ffffff", bg: "#7E1850", border: "#9e2264" },
  "Blue Cross Blue Shield": { abbr: "BC", textColor: "#ffffff", bg: "#003087", border: "#004ab0" },
  UnitedHealthcare:       { abbr: "UH", textColor: "#ffffff", bg: "#CC2529", border: "#e02a2e" },
  Medicare:               { abbr: "Mc", textColor: "#ffffff", bg: "#1A477C", border: "#1e5699" },
  Cigna:                  { abbr: "Ci", textColor: "#ffffff", bg: "#006EB6", border: "#0082d4" },
};

const INJURY_TAG_COLORS = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#14b8a6"];

const TODAY_DISPLAY = "April 27, 2026";

const NPS_COLOR = (score: number) =>
  score >= 70 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

const NPS_LABEL = (score: number) =>
  score >= 70 ? "Excellent" : score >= 50 ? "Good" : "Needs work";

// ─── Sub-components ───────────────────────────────────────────────────────────

function NpsBadge({ score, size = 88 }: { score: number; size?: number }) {
  const sw = 7;
  const r = (size - sw) / 2;
  const C = 2 * Math.PI * r;
  const dash = (score / 100) * C;
  const color = NPS_COLOR(score);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${C - dash}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-heading font-bold leading-none" style={{ fontSize: size * 0.27, color }}>{score}</span>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">NPS</span>
      </div>
    </div>
  );
}

function InsurancePill({ name, large = false }: { name: string; large?: boolean }) {
  const cfg = INSURANCE_CONFIG[name];
  if (!cfg) return null;
  return (
    <div
      className={cn("flex items-center gap-2.5 rounded-xl border transition-all", large ? "px-4 py-3" : "px-3 py-2")}
      style={{ backgroundColor: `${cfg.bg}18`, borderColor: `${cfg.border}40` }}
    >
      <div
        className={cn("rounded-lg flex items-center justify-center shrink-0 font-bold", large ? "w-9 h-9 text-[13px]" : "w-7 h-7 text-[11px]")}
        style={{ backgroundColor: cfg.bg, color: cfg.textColor }}
      >
        {cfg.abbr}
      </div>
      <span className={cn("font-semibold text-slate-200", large ? "text-[14px]" : "text-[12px]")}>{name}</span>
    </div>
  );
}

function InjuryTag({ label, index, large = false }: { label: string; index: number; large?: boolean }) {
  const color = INJURY_TAG_COLORS[index % INJURY_TAG_COLORS.length];
  return (
    <span
      className={cn("inline-flex items-center rounded-full font-semibold", large ? "px-4 py-1.5 text-[13px]" : "px-3 py-1 text-[12px]")}
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

function StatCard({ value, label, sub, color }: { value: string | number; label: string; sub?: string; color: string }) {
  return (
    <div className="bg-[#0d1220] rounded-xl p-5 border border-white/[0.06] flex-1" style={{ borderTop: `2px solid ${color}` }}>
      <div className="text-[30px] font-heading font-bold leading-none mb-1" style={{ color }}>{value}</div>
      <div className="text-[13px] font-medium text-slate-300 leading-none mb-0.5">{label}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditForm({
  draft,
  setDraft,
  saving,
  error,
  onSave,
  onCancel,
}: {
  draft: ClinicProfile;
  setDraft: React.Dispatch<React.SetStateAction<ClinicProfile>>;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  function field(key: keyof ClinicProfile) {
    return {
      value: draft[key] as string | number,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setDraft((d) => ({ ...d, [key]: e.target.value })),
    };
  }

  function toggleInjury(opt: string) {
    setDraft((d) => {
      const lower = opt.toLowerCase();
      const has = d.injury_types.some((t) => t.toLowerCase() === lower);
      return {
        ...d,
        injury_types: has
          ? d.injury_types.filter((t) => t.toLowerCase() !== lower)
          : [...d.injury_types, lower],
      };
    });
  }

  function toggleInsurance(opt: string) {
    setDraft((d) => ({
      ...d,
      insurances_accepted: d.insurances_accepted.includes(opt)
        ? d.insurances_accepted.filter((t) => t !== opt)
        : [...d.insurances_accepted, opt],
    }));
  }

  const inputCls = "w-full h-9 bg-[#0d1220] border border-white/[0.08] text-slate-200 text-[13px] rounded-lg px-3 focus:outline-none focus:border-blue-500/40 hover:border-white/[0.14] transition-colors placeholder:text-slate-600";
  const labelCls = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-5">
      {/* ── Practice Info ───────────────────────────────────────────────────── */}
      <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-6">
        <h3 className="font-heading font-semibold text-[14px] text-white mb-5">Practice Info</h3>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Practice Name</label>
            <input className={inputCls} {...field("name")} placeholder="Clinic name" />
          </div>
          <div>
            <label className={labelCls}>Street Address</label>
            <input className={inputCls} {...field("address")} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className={labelCls}>City</label>
              <input className={inputCls} {...field("city")} placeholder="City" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <select
                className={inputCls}
                value={draft.state}
                onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
              >
                <option value="">— State —</option>
                {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>ZIP</label>
              <input className={inputCls} {...field("zip")} placeholder="78701" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>NPI Number</label>
              <input className={inputCls} {...field("npi_number")} placeholder="1234567890" />
            </div>
            <div>
              <label className={labelCls}>NPS Score (0–100)</label>
              <input
                type="number" min={0} max={100}
                className={inputCls}
                value={draft.nps_score}
                onChange={(e) => setDraft((d) => ({ ...d, nps_score: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Avg Recovery (days)</label>
              <input
                type="number" min={1}
                className={inputCls}
                value={draft.avg_recovery_days}
                onChange={(e) => setDraft((d) => ({ ...d, avg_recovery_days: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Conditions ──────────────────────────────────────────────────────── */}
      <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-[14px] text-white">Conditions Treated</h3>
          {draft.injury_types.length > 0 && (
            <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
              {draft.injury_types.length} selected
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {INJURY_OPTIONS.map((opt) => {
            const selected = draft.injury_types.some((t) => t.toLowerCase() === opt.toLowerCase());
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleInjury(opt)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all duration-150",
                  selected
                    ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                    : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:border-white/[0.12] hover:text-slate-300"
                )}
              >
                {selected && <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />}
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Insurance ───────────────────────────────────────────────────────── */}
      <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-[14px] text-white">Insurance Accepted</h3>
          {draft.insurances_accepted.length > 0 && (
            <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">
              {draft.insurances_accepted.length} selected
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {INSURANCE_OPTIONS.map((opt) => {
            const selected = draft.insurances_accepted.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleInsurance(opt)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium border transition-all duration-150",
                  selected
                    ? "bg-green-500/15 text-green-300 border-green-500/30"
                    : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:border-white/[0.12] hover:text-slate-300"
                )}
              >
                {selected && <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />}
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-slate-400 border border-white/[0.08] rounded-lg hover:text-slate-200 hover:border-white/[0.15] transition-all"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-[13px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_18px_rgba(59,130,246,0.3)] transition-all"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Admin view ───────────────────────────────────────────────────────────────

function AdminView() {
  const { currentClinic: clinic, updateClinic } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ClinicProfile>({ ...clinic });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setDraft({ ...clinic }); }, [clinic.id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateClinic(draft);
      setIsEditing(false);
    } catch {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  }

  if (isEditing) {
    return (
      <EditForm
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        error={error}
        onSave={handleSave}
        onCancel={() => { setIsEditing(false); setDraft({ ...clinic }); }}
      />
    );
  }

  const npsColor = NPS_COLOR(clinic.nps_score);

  return (
    <div className="space-y-5">
      {/* ── 1. Header ──────────────────────────────────────────────────────── */}
      <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] shrink-0">
              <Activity className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-[22px] text-white leading-tight">{clinic.name}</h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5 text-[13px] text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                  {clinic.address}, {clinic.city}, {clinic.state} {clinic.zip}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-700" />
                <span className="text-[12px] font-mono text-slate-500">NPI: {clinic.npi_number}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-[12px] font-medium text-slate-300 border border-white/[0.08] rounded-lg hover:text-white hover:border-white/[0.16] hover:bg-white/[0.04] transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit profile
            </button>
            <div className="flex flex-col items-center">
              <NpsBadge score={clinic.nps_score} size={88} />
              <span className="text-[11px] font-semibold mt-1" style={{ color: npsColor }}>{NPS_LABEL(clinic.nps_score)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2 + 3. Outcomes + Insurance ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-400" />
            <h3 className="font-heading font-semibold text-[14px] text-white">Conditions Treated</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {clinic.injury_types.map((t, i) => <InjuryTag key={t} label={t} index={i} />)}
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border" style={{ backgroundColor: "#3b82f610", borderColor: "#3b82f625" }}>
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-[20px] font-heading font-bold text-white leading-none">
                {clinic.avg_recovery_days}<span className="text-[13px] font-medium text-slate-400 ml-1">days</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Average recovery timeline</div>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-green-400" />
            <h3 className="font-heading font-semibold text-[14px] text-white">Insurance Accepted</h3>
          </div>
          <div className="flex flex-col gap-2.5">
            {clinic.insurances_accepted.map((ins: string) => <InsurancePill key={ins} name={ins} />)}
          </div>
        </div>
      </div>

      {/* ── 4. Stats row ───────────────────────────────────────────────────── */}
      <div className="flex gap-4">
        <StatCard value={EXTRA_STATS.total_patients.toLocaleString()} label="Patients Treated" sub="Since establishment" color="#3b82f6" />
        <StatCard value={clinic.nps_score} label="Average NPS Score" sub={NPS_LABEL(clinic.nps_score)} color={npsColor} />
        <StatCard value={clinic.injury_types.length} label="Conditions Treated" sub="Specialties on file" color="#a855f7" />
        <StatCard value={`${EXTRA_STATS.years_established}yr`} label="Years Established" sub={`Since ${2026 - EXTRA_STATS.years_established}`} color="#f97316" />
      </div>
    </div>
  );
}

// ─── Preview (referral partner) view ─────────────────────────────────────────

function PreviewView() {
  const { currentClinic: clinic } = useAppContext();
  const npsColor = NPS_COLOR(clinic.nps_score);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[720px]">
        <div className="rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden" style={{ backgroundColor: "#f8fafc" }}>
          {/* Doc header band */}
          <div className="px-8 py-6 flex items-center justify-between" style={{ backgroundColor: "#07182e" }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.5)]">
                <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-heading font-bold text-[17px] text-white leading-none">{clinic.name}</div>
                <div className="text-[11px] text-blue-400/80 mt-0.5">Referral Partner Profile</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Generated</div>
              <div className="text-[12px] text-slate-300 font-medium">{TODAY_DISPLAY}</div>
            </div>
          </div>

          {/* Doc body */}
          <div className="px-8 py-7 space-y-7">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {clinic.address}, {clinic.city}, {clinic.state} {clinic.zip}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {EXTRA_STATS.phone}
                  <span className="text-slate-300 mx-1">·</span>
                  <span className="text-slate-500">Fax:</span> {EXTRA_STATS.fax}
                </div>
                <div className="text-[12px] font-mono text-slate-400">
                  NPI: <span className="text-slate-600 font-semibold">{clinic.npi_number}</span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: npsColor, backgroundColor: `${npsColor}15` }}>
                  <div className="text-center">
                    <div className="text-[20px] font-heading font-bold leading-none" style={{ color: npsColor }}>{clinic.nps_score}</div>
                    <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">NPS</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold mt-1" style={{ color: npsColor }}>{NPS_LABEL(clinic.nps_score)}</span>
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">At a Glance</h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: EXTRA_STATS.total_patients.toLocaleString(), label: "Patients Treated", color: "#3b82f6" },
                  { value: `${clinic.avg_recovery_days} days`, label: "Avg Recovery Time", color: "#22c55e" },
                  { value: `${clinic.insurances_accepted.length} Plans`, label: "Insurance Networks", color: "#a855f7" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-4 border"
                    style={{ backgroundColor: `${s.color}08`, borderColor: `${s.color}25` }}>
                    <div className="text-[22px] font-heading font-bold leading-none mb-1" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[12px] text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Conditions &amp; Specialties</h4>
              <div className="flex flex-wrap gap-2">
                {clinic.injury_types.map((t: string, i: number) => <InjuryTag key={t} label={t} index={i} large />)}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Insurance Accepted</h4>
              <div className="grid grid-cols-2 gap-2.5">
                {clinic.insurances_accepted.map((ins: string) => <InsurancePill key={ins} name={ins} large />)}
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ backgroundColor: "#3b82f608", borderColor: "#3b82f620" }}>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">How to Refer</h4>
              <div className="space-y-1.5">
                {[
                  `Fax referral order to ${EXTRA_STATS.fax}`,
                  "New patients typically scheduled within 48 business hours",
                  `Online intake forms available — email ${EXTRA_STATS.email}`,
                  `NPI ${clinic.npi_number} is active with all listed payers`,
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: "#3b82f615", color: "#3b82f6" }}>
                      {i + 1}
                    </span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Doc footer */}
          <div className="px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: "#e2e8f0", backgroundColor: "#f1f5f9" }}>
            <span className="text-[11px] text-slate-400">{clinic.name} · {clinic.city}, {clinic.state} · Confidential</span>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] text-slate-400">{EXTRA_STATS.referral_appointments_per_month} referral appointments/mo avg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClinicProfilePage() {
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div className="p-6 space-y-5">
      {/* ── Top action bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          {isPreview && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              Viewing as referring physician would see it
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => console.log("[ClinicProfile] Generate PDF")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg border transition-all",
              isPreview
                ? "border-white/[0.06] text-slate-500 bg-transparent cursor-not-allowed opacity-50"
                : "border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.16] hover:bg-white/[0.04]"
            )}
            disabled={isPreview}
          >
            <FileText className="w-3.5 h-3.5" />
            Generate PDF
          </button>
          <button
            onClick={() => setIsPreview((v) => !v)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-[13px] font-semibold rounded-lg transition-all",
              isPreview
                ? "bg-blue-600 text-white shadow-[0_0_18px_rgba(59,130,246,0.35)] hover:bg-blue-500"
                : "bg-white/[0.06] text-slate-300 border border-white/[0.08] hover:bg-white/[0.10] hover:text-white"
            )}
          >
            {isPreview ? (
              <><EyeOff className="w-3.5 h-3.5" />Exit preview</>
            ) : (
              <><Eye className="w-3.5 h-3.5" />Preview as referral partner sees it</>
            )}
          </button>
        </div>
      </div>

      {/* ── View ─────────────────────────────────────────────────────────────── */}
      {isPreview ? <PreviewView /> : <AdminView />}
    </div>
  );
}
