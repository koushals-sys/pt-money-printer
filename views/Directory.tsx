"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Printer,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgType, Organization, OutreachChannel, ReferralStatus } from "@/types";
import { useAppContext } from "@/lib/context";

// ─── Constants ────────────────────────────────────────────────────────────────

const ORG_TYPE_COLORS: Record<OrgType, string> = {
  ortho:        "#3b82f6",
  primary_care: "#22c55e",
  hospital:     "#a855f7",
  sports:       "#f97316",
  school:       "#14b8a6",
};

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  ortho:        "Ortho",
  primary_care: "Primary Care",
  hospital:     "Hospital",
  sports:       "Sports Med",
  school:       "School",
};

const STATUS_CONFIG: Record<ReferralStatus, { label: string; color: string; bg: string }> = {
  not_contacted: { label: "Not Contacted", color: "#64748b", bg: "rgba(100,116,139,0.12)" },
  contacted:     { label: "Contacted",     color: "#eab308", bg: "rgba(234,179,8,0.12)"   },
  follow_up:     { label: "Follow Up",     color: "#f97316", bg: "rgba(249,115,22,0.12)"  },
  established:   { label: "Established",   color: "#22c55e", bg: "rgba(34,197,94,0.12)"   },
};

const TYPE_FILTER_OPTIONS: { value: OrgType | "all"; label: string }[] = [
  { value: "all",          label: "All" },
  { value: "ortho",        label: "Ortho" },
  { value: "primary_care", label: "Primary Care" },
  { value: "hospital",     label: "Hospital" },
  { value: "sports",       label: "Sports" },
  { value: "school",       label: "School / College" },
];

const DISTANCE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Any distance" },
  { value: 5,    label: "Within 5 mi" },
  { value: 10,   label: "Within 10 mi" },
  { value: 25,   label: "Within 25 mi" },
  { value: 50,   label: "Within 50 mi" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "nearest",            label: "Nearest first" },
  { value: "recently_contacted", label: "Recently contacted" },
  { value: "not_contacted",      label: "Not yet contacted" },
];

const ORG_ACTIONS: { Icon: LucideIcon; title: string; color: string }[] = [
  { Icon: Mail,          title: "Email", color: "#3b82f6" },
  { Icon: MessageSquare, title: "SMS",   color: "#22c55e" },
  { Icon: Phone,         title: "Call",  color: "#a855f7" },
  { Icon: Printer,       title: "Fax",   color: "#f97316" },
];

const US_STATES: { abbr: string; name: string }[] = [
  { abbr: "AL", name: "Alabama" },       { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" },       { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" },    { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" },   { abbr: "DE", name: "Delaware" },
  { abbr: "DC", name: "D.C." },          { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" },       { abbr: "HI", name: "Hawaii" },
  { abbr: "ID", name: "Idaho" },         { abbr: "IL", name: "Illinois" },
  { abbr: "IN", name: "Indiana" },       { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" },        { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" },     { abbr: "ME", name: "Maine" },
  { abbr: "MD", name: "Maryland" },      { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" },      { abbr: "MN", name: "Minnesota" },
  { abbr: "MS", name: "Mississippi" },   { abbr: "MO", name: "Missouri" },
  { abbr: "MT", name: "Montana" },       { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" },        { abbr: "NH", name: "New Hampshire" },
  { abbr: "NJ", name: "New Jersey" },    { abbr: "NM", name: "New Mexico" },
  { abbr: "NY", name: "New York" },      { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" },  { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" },      { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" },  { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" },{ abbr: "SD", name: "South Dakota" },
  { abbr: "TN", name: "Tennessee" },     { abbr: "TX", name: "Texas" },
  { abbr: "UT", name: "Utah" },          { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" },      { abbr: "WA", name: "Washington" },
  { abbr: "WV", name: "West Virginia" }, { abbr: "WI", name: "Wisconsin" },
  { abbr: "WY", name: "Wyoming" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type SortOption = "nearest" | "recently_contacted" | "not_contacted";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDistance(miles?: number): string {
  if (miles === undefined) return "—";
  if (miles < 1) return "< 1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActionButton({
  Icon,
  title,
  color,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  color: string;
  onClick: () => void;
}) {
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
        borderColor: hovered ? `${color}40` : "rgba(255,255,255,0.07)",
      }}
    >
      <Icon
        className="w-3.5 h-3.5 transition-colors duration-150"
        style={{ color: hovered ? color : "#64748b" }}
      />
    </button>
  );
}

function SelectFilter({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full appearance-none bg-[#0d1220] border border-white/[0.08] text-slate-300 text-[13px] rounded-lg pl-3 pr-8 cursor-pointer focus:outline-none focus:border-blue-500/40 hover:border-white/[0.15] transition-colors"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
    </div>
  );
}

function OrgCard({
  org,
  onOutreach,
}: {
  org: Organization;
  onOutreach: (channel: OutreachChannel) => void;
}) {
  const typeColor = ORG_TYPE_COLORS[org.type];
  const status = STATUS_CONFIG[org.referral_status];

  return (
    <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-5 flex flex-col gap-4 hover:border-white/10 transition-colors">
      {/* Top row: type badge + On Spry */}
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold"
          style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
        >
          <Building2 className="w-3 h-3" />
          {ORG_TYPE_LABELS[org.type]}
        </span>
        {org.is_on_spry && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            ✦ On Spry
          </span>
        )}
      </div>

      {/* Org info */}
      <div>
        <h3 className="font-heading font-semibold text-[15px] text-slate-100 leading-snug mb-2">
          {org.name}
        </h3>
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500 mb-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>
            {org.city}, {org.state}
          </span>
          {org.distance_miles !== undefined && (
            <>
              <span className="text-white/10">·</span>
              <span>{formatDistance(org.distance_miles)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <Phone className="w-3 h-3 shrink-0" />
          <span>{org.phone}</span>
        </div>
      </div>

      {/* Status pill */}
      <div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ backgroundColor: status.bg, color: status.color }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          {status.label}
        </span>
      </div>

      {/* Footer: action buttons + view profile */}
      <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          {ORG_ACTIONS.map((a) => (
            <ActionButton
              key={a.title}
              {...a}
              onClick={() => onOutreach(a.title.toLowerCase() as OutreachChannel)}
            />
          ))}
        </div>
        <button
          onClick={() => console.log(`[Directory] View profile: ${org.id}`)}
          className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium text-slate-400 border border-white/[0.07] rounded-lg hover:border-white/[0.15] hover:text-slate-200 hover:bg-white/[0.03] transition-all duration-150"
        >
          View profile
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Directory() {
  const { openModal, organizations } = useAppContext();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<OrgType | "all">("all");
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("nearest");

  const results = useMemo(() => {
    let out: Organization[] = [...organizations];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((o) => o.name.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") {
      out = out.filter((o) => o.type === typeFilter);
    }
    if (distanceFilter !== null) {
      out = out.filter((o) => (o.distance_miles ?? Infinity) <= distanceFilter);
    }
    if (stateFilter !== "all") {
      out = out.filter((o) => o.state === stateFilter);
    }

    return [...out].sort((a, b) => {
      if (sort === "nearest") {
        return (a.distance_miles ?? Infinity) - (b.distance_miles ?? Infinity);
      }
      if (sort === "recently_contacted") {
        return (b.last_contacted_at?.getTime() ?? 0) - (a.last_contacted_at?.getTime() ?? 0);
      }
      // not_contacted first
      const aNC = a.referral_status === "not_contacted" ? 0 : 1;
      const bNC = b.referral_status === "not_contacted" ? 0 : 1;
      return aNC - bNC;
    });
  }, [organizations, search, typeFilter, distanceFilter, stateFilter, sort]);

  const hasActiveFilters = typeFilter !== "all" || distanceFilter !== null || stateFilter !== "all";

  function clearFilters() {
    setTypeFilter("all");
    setDistanceFilter(null);
    setStateFilter("all");
  }

  return (
    <div className="p-6 space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {results.length} of {organizations.length} organizations
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* ── Search + Sort ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="w-full h-10 bg-[#0d1220] border border-white/[0.08] text-slate-200 text-[14px] placeholder:text-slate-600 rounded-lg pl-10 pr-4 focus:outline-none focus:border-blue-500/40 hover:border-white/[0.12] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <SelectFilter
          value={sort}
          onChange={(v) => setSort(v as SortOption)}
          className="w-52"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectFilter>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Type chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_FILTER_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTypeFilter(t.value)}
              className={cn(
                "px-3 py-[6px] rounded-lg text-[12px] font-medium border transition-all duration-150",
                typeFilter === t.value
                  ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
                  : "text-slate-400 border-white/[0.07] hover:text-slate-200 hover:border-white/[0.14] hover:bg-white/[0.03]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/[0.07] mx-1" />

        {/* Distance dropdown */}
        <SelectFilter
          value={distanceFilter === null ? "null" : String(distanceFilter)}
          onChange={(v) => setDistanceFilter(v === "null" ? null : Number(v))}
          className="w-40"
        >
          {DISTANCE_OPTIONS.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </SelectFilter>

        {/* State dropdown */}
        <SelectFilter
          value={stateFilter}
          onChange={setStateFilter}
          className="w-44"
        >
          <option value="all">All states</option>
          {US_STATES.map((s) => (
            <option key={s.abbr} value={s.abbr}>
              {s.abbr} — {s.name}
            </option>
          ))}
        </SelectFilter>

        {/* Active filter summary */}
        {hasActiveFilters && (
          <span className="text-[11px] text-slate-500 italic">
            {[
              typeFilter !== "all" && ORG_TYPE_LABELS[typeFilter as OrgType],
              distanceFilter !== null && `≤ ${distanceFilter} mi`,
              stateFilter !== "all" && stateFilter,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </div>

      {/* ── Results grid ───────────────────────────────────────────────────── */}
      {results.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {results.map((org) => (
            <OrgCard
              key={org.id}
              org={org}
              onOutreach={(channel) => openModal(org, channel)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-slate-600" />
          </div>
          <p className="text-[15px] font-medium text-slate-400 mb-1">
            No organizations match your filters
          </p>
          <p className="text-[13px] text-slate-600 mb-5">
            Try adjusting your search or clearing the active filters.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-[13px] font-medium text-slate-300 border border-white/10 rounded-lg hover:border-white/20 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            Clear all filters
          </button>
        </div>
      )}

    </div>
  );
}
