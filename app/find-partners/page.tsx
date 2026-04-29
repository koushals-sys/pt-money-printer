"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Printer,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Layout from "@/components/Layout";
import { useAppContext } from "@/lib/context";
import { useToast } from "@/lib/toast";
import { searchNPIRegistry } from "@/lib/npiLookup";
import { scoreAndSort, type MatchTier, type ScoredOrg } from "@/lib/matchScore";
import type { Organization, OutreachChannel, OrgType } from "@/types";
import { cn } from "@/lib/utils";

// ─── Specialty search options ─────────────────────────────────────────────────
// Each maps a human label to an NPI taxonomy search term and the injury types
// from our clinic that benefit from this referring specialty.

interface SpecialtyOption {
  label: string;
  npiTerm: string | undefined;
  relatedInjuries: string[];
  color: string;
}

const SPECIALTY_OPTIONS: SpecialtyOption[] = [
  {
    label: "Orthopedic",
    npiTerm: "orthopedic",
    relatedInjuries: ["ACL Tear", "Rotator Cuff", "Hip Replacement"],
    color: "#3b82f6",
  },
  {
    label: "Sports Medicine",
    npiTerm: "sports medicine",
    relatedInjuries: ["Sports Injuries", "ACL Tear"],
    color: "#f97316",
  },
  {
    label: "Family Medicine",
    npiTerm: "family medicine",
    relatedInjuries: ["Lower Back Pain"],
    color: "#22c55e",
  },
  {
    label: "Internal Medicine",
    npiTerm: "internal medicine",
    relatedInjuries: ["Lower Back Pain"],
    color: "#14b8a6",
  },
  {
    label: "All nearby",
    npiTerm: undefined,
    relatedInjuries: [],
    color: "#a855f7",
  },
];

// ─── Static display maps ──────────────────────────────────────────────────────

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  ortho:        "Orthopedic",
  primary_care: "Primary Care",
  hospital:     "Hospital",
  sports:       "Sports Med",
  school:       "School",
};

const ORG_TYPE_COLORS: Record<OrgType, string> = {
  ortho:        "#3b82f6",
  primary_care: "#22c55e",
  hospital:     "#a855f7",
  sports:       "#f97316",
  school:       "#14b8a6",
};

const TIER_CONFIG: Record<MatchTier, { label: string; bg: string; text: string; border: string }> = {
  strong:   { label: "Strong match",    bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/25" },
  moderate: { label: "Moderate match",  bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/25" },
  weak:     { label: "Weak match",      bg: "bg-slate-500/10",  text: "text-slate-400",  border: "border-slate-500/20" },
};

const CHANNEL_ACTIONS: { channel: OutreachChannel; Icon: LucideIcon; color: string; title: string }[] = [
  { channel: "email", Icon: Mail,          color: "#3b82f6", title: "Email" },
  { channel: "sms",   Icon: MessageSquare, color: "#22c55e", title: "SMS"   },
  { channel: "phone", Icon: Phone,         color: "#a855f7", title: "Call"  },
  { channel: "fax",   Icon: Printer,       color: "#f97316", title: "Fax"   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDistance(miles?: number): string {
  if (miles === undefined) return "—";
  if (miles < 1)  return "< 1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

/** Merge NPI results with seed orgs, deduplicating by NPI number. */
function mergeOrgs(existing: Organization[], incoming: Organization[]): Organization[] {
  const seenNPIs = new Set(existing.map((o) => o.npi_number).filter(Boolean));
  const novel = incoming.filter((o) => !o.npi_number || !seenNPIs.has(o.npi_number));
  return [...existing, ...novel];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChannelButton({
  channel, Icon, color, title, onClick,
}: { channel: OutreachChannel; Icon: LucideIcon; color: string; title: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-150"
      style={{
        backgroundColor: hovered ? `${color}1a` : "transparent",
        borderColor:      hovered ? `${color}40` : "rgba(255,255,255,0.07)",
      }}
    >
      <Icon className="w-3.5 h-3.5 transition-colors" style={{ color: hovered ? color : "#64748b" }} />
    </button>
  );
}

function ScoreBadge({ score, tier }: { score: number; tier: MatchTier }) {
  const cfg = TIER_CONFIG[tier];
  return (
    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold", cfg.bg, cfg.text, cfg.border)}>
      <Sparkles className="w-3 h-3" />
      <span>{score}</span>
      <span className="opacity-70">· {cfg.label}</span>
    </div>
  );
}

function PartnerCard({
  org,
  expanded,
  onToggleExpand,
  onOutreach,
}: {
  org: ScoredOrg;
  expanded: boolean;
  onToggleExpand: () => void;
  onOutreach: (channel: OutreachChannel) => void;
}) {
  const typeColor = ORG_TYPE_COLORS[org.type];
  const tier = TIER_CONFIG[org.match.tier];

  return (
    <div
      className={cn(
        "bg-[#0a0e1a] rounded-xl border transition-all duration-200",
        org.match.tier === "strong"
          ? "border-green-500/15 hover:border-green-500/25"
          : "border-white/[0.06] hover:border-white/10"
      )}
    >
      {/* Top accent bar */}
      <div
        className="h-[2px] rounded-t-xl"
        style={{
          background:
            org.match.tier === "strong"
              ? "linear-gradient(90deg, #22c55e, #16a34a)"
              : org.match.tier === "moderate"
              ? "linear-gradient(90deg, #eab308, #ca8a04)"
              : "rgba(255,255,255,0.06)",
        }}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-semibold text-[14px] text-slate-100 leading-snug mb-1 truncate">
              {org.name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Org type */}
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
              >
                <Building2 className="w-2.5 h-2.5" />
                {ORG_TYPE_LABELS[org.type]}
              </span>
              {/* Location */}
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="w-2.5 h-2.5" />
                {org.city}, {org.state}
                {org.distance_miles !== undefined && (
                  <span className="text-slate-600 ml-0.5">· {formatDistance(org.distance_miles)}</span>
                )}
              </span>
              {/* On Spry */}
              {org.is_on_spry && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  ✦ Spry
                </span>
              )}
            </div>
          </div>

          {/* Score badge */}
          <ScoreBadge score={org.match.score} tier={org.match.tier} />
        </div>

        {/* Matched injuries */}
        {org.match.matchedInjuries.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {org.match.matchedInjuries.map((inj) => (
              <span
                key={inj}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-slate-400"
              >
                {inj}
              </span>
            ))}
          </div>
        )}

        {/* Reasons (expandable) */}
        {org.match.reasons.length > 0 && (
          <div className="mb-4">
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors mb-1.5"
            >
              {expanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {expanded ? "Hide reasons" : `${org.match.reasons.length} reason${org.match.reasons.length > 1 ? "s" : ""}`}
            </button>
            {expanded && (
              <ul className="space-y-1.5">
                {org.match.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-slate-400 leading-relaxed">
                    <span className={cn("mt-[3px] w-1.5 h-1.5 rounded-full shrink-0", tier.bg, tier.text.replace("text", "bg"))}
                      style={{ backgroundColor: org.match.tier === "strong" ? "#22c55e" : org.match.tier === "moderate" ? "#eab308" : "#64748b" }}
                    />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
          <div className="flex gap-1.5">
            {CHANNEL_ACTIONS.map((a) => (
              <ChannelButton
                key={a.channel}
                {...a}
                onClick={() => onOutreach(a.channel)}
              />
            ))}
          </div>
          <div className="text-[11px] text-slate-600">{org.npi_number}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SearchStatus = "idle" | "loading" | "done" | "error";

export default function FindPartnersPage() {
  const { currentClinic, openModal, organizations } = useAppContext();
  const { showToast } = useToast();

  const [status, setStatus]               = useState<SearchStatus>("idle");
  const [activeOption, setActiveOption]   = useState<SpecialtyOption>(SPECIALTY_OPTIONS[0]);
  const [npiResults, setNpiResults]       = useState<Organization[]>([]);
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [tierFilter, setTierFilter]       = useState<MatchTier | "all">("all");

  // Merge NPI results with seeded orgs (seed orgs have richer data so they take priority)
  const allOrgs = useMemo(
    () => mergeOrgs(organizations, npiResults),
    [organizations, npiResults]
  );

  // Score & sort every time orgs or clinic profile changes
  const scoredOrgs = useMemo(
    () => scoreAndSort(allOrgs, currentClinic),
    [allOrgs, currentClinic]
  );

  const filtered = useMemo(
    () => tierFilter === "all" ? scoredOrgs : scoredOrgs.filter((o) => o.match.tier === tierFilter),
    [scoredOrgs, tierFilter]
  );

  async function runSearch(option: SpecialtyOption) {
    if (!currentClinic.city || !currentClinic.state) {
      showToast("Update your clinic city and state in Settings before searching", "error");
      return;
    }
    setActiveOption(option);
    setStatus("loading");
    try {
      const results = await searchNPIRegistry({
        city:      currentClinic.city,
        state:     currentClinic.state,
        specialty: option.npiTerm,
        limit:     20,
      });
      setNpiResults(results);
      setStatus("done");
      if (results.length > 0) {
        showToast(`Found ${results.length} new organizations from NPI Registry`, "success");
      }
    } catch {
      setStatus("error");
      showToast("NPI Registry search failed — showing local results only", "error");
    }
  }

  // Auto-search once clinic city/state are available
  useEffect(() => {
    if (!currentClinic.city || !currentClinic.state) return;
    runSearch(SPECIALTY_OPTIONS[0]);
  }, [currentClinic.city, currentClinic.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const strongCount   = scoredOrgs.filter((o) => o.match.tier === "strong").length;
  const moderateCount = scoredOrgs.filter((o) => o.match.tier === "moderate").length;

  return (
    <Layout pageTitle="Find Partners">
      <div className="p-6 space-y-5">

        {/* ── Clinic outcomes banner ──────────────────────────────────────── */}
        <div className="bg-[#0a0e1a] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-[13px] font-semibold text-slate-200">
                  Matching based on {currentClinic.name}'s outcomes
                </span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <MapPin className="w-3 h-3" />
                {currentClinic.city}, {currentClinic.state}
                <span className="text-white/10">·</span>
                NPS {currentClinic.nps_score}
                <span className="text-white/10">·</span>
                Avg {currentClinic.avg_recovery_days}d recovery
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentClinic.injury_types.map((inj) => (
              <span
                key={inj}
                className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20"
              >
                {inj}
              </span>
            ))}
          </div>
        </div>

        {/* ── Specialty search row ────────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Search nearby by referring specialty
          </p>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((opt) => {
              const active = activeOption.label === opt.label;
              return (
                <button
                  key={opt.label}
                  onClick={() => runSearch(opt)}
                  disabled={status === "loading"}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium border transition-all duration-150 disabled:opacity-50",
                    active
                      ? "text-white border-opacity-30"
                      : "text-slate-400 border-white/[0.07] hover:text-slate-200 hover:border-white/[0.15] hover:bg-white/[0.03]"
                  )}
                  style={
                    active
                      ? { backgroundColor: `${opt.color}18`, borderColor: `${opt.color}35`, color: opt.color }
                      : undefined
                  }
                >
                  {status === "loading" && active ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: active ? opt.color : "#475569" }}
                    />
                  )}
                  {opt.label}
                  {opt.relatedInjuries.length > 0 && (
                    <span className="text-[10px] opacity-60">
                      ({opt.relatedInjuries.length} condition{opt.relatedInjuries.length > 1 ? "s" : ""})
                    </span>
                  )}
                </button>
              );
            })}

            {status === "done" && (
              <button
                onClick={() => runSearch(activeOption)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-slate-500 border border-white/[0.06] hover:text-slate-300 hover:border-white/[0.12] transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* ── Results header ──────────────────────────────────────────────── */}
        {scoredOrgs.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-slate-400">
                {filtered.length} organizations
              </span>
              {strongCount > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                  {strongCount} strong match{strongCount > 1 ? "es" : ""}
                </span>
              )}
              {moderateCount > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/25">
                  {moderateCount} moderate
                </span>
              )}
            </div>

            {/* Tier filter */}
            <div className="flex items-center gap-1">
              {(["all", "strong", "moderate", "weak"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all",
                    tierFilter === t
                      ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
                      : "text-slate-500 border-transparent hover:text-slate-300"
                  )}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Results grid ────────────────────────────────────────────────── */}
        {status === "loading" && npiResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
            <p className="text-[13px] text-slate-500">
              Searching NPI Registry in {currentClinic.city}, {currentClinic.state}…
            </p>
          </div>
        ) : status === "idle" ? (
          !currentClinic.city || !currentClinic.state ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                <MapPin className="w-7 h-7 text-yellow-400" />
              </div>
              <p className="text-[15px] font-semibold text-slate-300 mb-1">
                Clinic location not set
              </p>
              <p className="text-[13px] text-slate-500 max-w-[320px]">
                Add your city and state in{" "}
                <a href="/settings" className="text-blue-400 hover:text-blue-300 underline">Settings → Clinic Profile</a>{" "}
                so we can find nearby referral partners.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-blue-400" />
              </div>
              <p className="text-[15px] font-semibold text-slate-300 mb-1">
                Find your referral partners
              </p>
              <p className="text-[13px] text-slate-500 max-w-[320px]">
                Select a specialty above and click <strong className="text-slate-400">Search</strong> to
                discover nearby {currentClinic.city}-area organizations from the NPI registry.
              </p>
            </div>
          )
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-[14px] font-medium text-slate-400 mb-1">No results</p>
            <p className="text-[12px] text-slate-600">Try a different specialty or clear the tier filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((org) => (
              <PartnerCard
                key={org.id}
                org={org}
                expanded={expandedId === org.id}
                onToggleExpand={() =>
                  setExpandedId((prev) => (prev === org.id ? null : org.id))
                }
                onOutreach={(ch) => openModal(org, ch)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
