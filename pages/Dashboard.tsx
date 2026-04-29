"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  Printer,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgType, OutreachChannel, ReferralStatus } from "@/types";
import { useAppContext } from "@/lib/context";

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date("2026-04-27T00:00:00");

const ORG_TYPE_COLORS: Record<OrgType, string> = {
  ortho: "#3b82f6",
  primary_care: "#22c55e",
  hospital: "#a855f7",
  sports: "#f97316",
  school: "#14b8a6",
};

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  ortho: "Ortho",
  primary_care: "Primary Care",
  hospital: "Hospital",
  sports: "Sports Med",
  school: "School",
};

const KANBAN_COLS: {
  status: ReferralStatus;
  label: string;
  accent: string;
  dotClass: string;
}[] = [
  { status: "not_contacted", label: "Not Contacted", accent: "#475569", dotClass: "bg-slate-400" },
  { status: "contacted",     label: "Contacted",     accent: "#eab308", dotClass: "bg-yellow-400" },
  { status: "follow_up",     label: "Follow Up",     accent: "#f97316", dotClass: "bg-orange-400" },
  { status: "established",   label: "Established",   accent: "#22c55e", dotClass: "bg-green-400" },
];

const CHANNEL_COLORS: Record<OutreachChannel, string> = {
  email: "#3b82f6",
  sms:   "#22c55e",
  phone: "#a855f7",
  fax:   "#f97316",
};

const CHANNEL_ICONS: Record<OutreachChannel, LucideIcon> = {
  email: Mail,
  sms:   MessageSquare,
  phone: Phone,
  fax:   Printer,
};

const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  email: "Email",
  sms:   "SMS",
  phone: "Phone",
  fax:   "Fax",
};

const ORG_ACTIONS: { Icon: LucideIcon; title: string; color: string }[] = [
  { Icon: Mail,           title: "Email", color: "#3b82f6" },
  { Icon: MessageSquare,  title: "SMS",   color: "#22c55e" },
  { Icon: Phone,          title: "Call",  color: "#a855f7" },
  { Icon: Printer,        title: "Fax",   color: "#f97316" },
];

const ORG_TYPE_FILTER_OPTIONS: (OrgType | "all")[] = [
  "all", "ortho", "primary_care", "hospital", "sports", "school",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diffDays = Math.floor((TODAY.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1300): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  delta: string;
  accentColor: string;
  Icon: LucideIcon;
}

function StatCard({ label, value, delta, accentColor, Icon }: StatCardProps) {
  const display = useCountUp(value);
  return (
    <div
      className="relative bg-[#0a0e1a] rounded-xl p-5 border border-white/5 overflow-hidden"
      style={{ borderTop: `2px solid ${accentColor}` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accentColor}1a` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color: accentColor }} />
        </div>
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-green-500/10 text-green-400"
        >
          <TrendingUp className="w-3 h-3" />
          {delta}
        </span>
      </div>
      <div className="text-[34px] font-heading font-bold text-slate-100 leading-none mb-1.5">
        {display}
      </div>
      <div className="text-[12px] text-slate-500">{label}</div>
      <div
        className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-[0.07] pointer-events-none"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  );
}

function ActionButton({
  Icon,
  title,
  color,
}: {
  Icon: LucideIcon;
  title: string;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-7 h-7 rounded-md flex items-center justify-center border transition-all duration-150"
      style={{
        backgroundColor: hovered ? `${color}1a` : "transparent",
        borderColor: hovered ? `${color}40` : "transparent",
      }}
    >
      <Icon
        className="w-3.5 h-3.5 transition-colors duration-150"
        style={{ color: hovered ? color : "#64748b" }}
      />
    </button>
  );
}

function AnimatedBar({ pct, color }: { pct: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

function DonutChart({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const size = 180;
  const sw = 30;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - sw) / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, d) => s + d.value, 0);

  let accumulated = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="Org type breakdown">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
      {segments.map((seg, i) => {
        const segLen = (seg.value / total) * C;
        const gap = Math.min(3, segLen * 0.12);
        const dashOffset = C - accumulated;
        accumulated += segLen;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={sw}
            strokeDasharray={`${segLen - gap} ${C - (segLen - gap)}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      {/* Centre labels */}
      <text
        x={cx}
        y={cy - 7}
        textAnchor="middle"
        fill="#f1f5f9"
        fontSize="28"
        fontWeight="700"
        fontFamily="var(--font-syne)"
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 13}
        textAnchor="middle"
        fill="#475569"
        fontSize="10"
        fontFamily="var(--font-dm-sans)"
      >
        organizations
      </text>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { organizations, outreachLogs } = useAppContext();
  const [orgTypeFilter, setOrgTypeFilter] = useState<OrgType | "all">("all");

  const establishedCount = useMemo(
    () => organizations.filter((o) => o.referral_status === "established").length,
    [organizations]
  );

  const stats = useMemo<StatCardProps[]>(() => {
    const outreachThisMonth = outreachLogs.filter(
      (l) =>
        l.sent_at.getMonth() === TODAY.getMonth() &&
        l.sent_at.getFullYear() === TODAY.getFullYear()
    ).length;
    const patientsEst = establishedCount * 8 + 2;
    return [
      {
        label: "Organizations in Directory",
        value: organizations.length,
        delta: "+3 this month",
        accentColor: "#3b82f6",
        Icon: Building2,
      },
      {
        label: "Outreach Sent This Month",
        value: outreachThisMonth,
        delta: "+2 vs last month",
        accentColor: "#a855f7",
        Icon: Send,
      },
      {
        label: "Referrals Established",
        value: establishedCount,
        delta: "+1 this month",
        accentColor: "#22c55e",
        Icon: CheckCircle2,
      },
      {
        label: "Patients from Referrals",
        value: patientsEst,
        delta: "+12 this month",
        accentColor: "#14b8a6",
        Icon: Users,
      },
    ];
  }, [organizations, outreachLogs, establishedCount]);

  const kanbanGroups = useMemo(
    () => KANBAN_COLS.map((col) => ({
      ...col,
      orgs: organizations.filter((o) => o.referral_status === col.status),
    })),
    [organizations]
  );

  const channelStats = useMemo(
    () => (["email", "sms", "phone", "fax"] as OutreachChannel[]).map((ch) => {
      const logs = outreachLogs.filter((l) => l.channel === ch);
      const sent = logs.length;
      const responses = logs.filter((l) => l.response_received).length;
      return {
        channel: ch,
        sent,
        responses,
        responseRate: sent > 0 ? Math.round((responses / sent) * 100) : 0,
      };
    }),
    [outreachLogs]
  );

  const maxSent = useMemo(
    () => Math.max(0, ...channelStats.map((c) => c.sent)),
    [channelStats]
  );

  const donutSegments = useMemo(
    () =>
      (["ortho", "primary_care", "hospital", "sports", "school"] as OrgType[])
        .map((type) => ({
          label: ORG_TYPE_LABELS[type],
          value: organizations.filter((o) => o.type === type).length,
          color: ORG_TYPE_COLORS[type],
        }))
        .filter((s) => s.value > 0),
    [organizations]
  );

  const activityItems = useMemo(
    () =>
      [...outreachLogs]
        .sort((a, b) => b.sent_at.getTime() - a.sent_at.getTime())
        .slice(0, 8),
    [outreachLogs]
  );

  const orgById = useMemo(
    () => Object.fromEntries(organizations.map((o) => [o.id, o])),
    [organizations]
  );

  const filteredOrgs = useMemo(
    () =>
      (orgTypeFilter === "all"
        ? organizations
        : organizations.filter((o) => o.type === orgTypeFilter)
      ).slice(0, 6),
    [organizations, orgTypeFilter]
  );

  const filteredTotal = useMemo(
    () =>
      orgTypeFilter === "all"
        ? organizations.length
        : organizations.filter((o) => o.type === orgTypeFilter).length,
    [organizations, orgTypeFilter]
  );

  return (
    <div className="p-6 space-y-5">

      {/* ── Get started banner (new accounts only) ────────────────────────── */}
      {organizations.length === 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(59,130,246,0.4)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-[15px] text-white mb-1">
              Welcome — your referral network starts here
            </h3>
            <p className="text-[13px] text-slate-400 mb-3">
              Search the NPI registry to find nearby hospitals, ortho practices, and primary care
              providers, then start building outreach relationships.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/find-partners"
                className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all"
              >
                <Search className="w-3.5 h-3.5" />
                Find partners
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/directory"
                className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-slate-300 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-all"
              >
                <Building2 className="w-3.5 h-3.5" />
                Add manually
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Row 1: Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* ── Row 2: Directory + Kanban ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Directory panel */}
        <div className="bg-[#0a0e1a] rounded-xl border border-white/5 overflow-hidden flex flex-col">
          <div className="px-5 pt-5 pb-4 border-b border-white/5 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-semibold text-[15px] text-white">Directory</h2>
              <span className="text-[11px] text-slate-500">
                {filteredOrgs.length} of {filteredTotal}
              </span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {ORG_TYPE_FILTER_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setOrgTypeFilter(t)}
                  className={cn(
                    "px-2.5 py-[5px] rounded-md text-[11px] font-medium border transition-all",
                    orgTypeFilter === t
                      ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
                      : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.04]"
                  )}
                >
                  {t === "all" ? "All" : ORG_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 divide-y divide-white/[0.04] overflow-y-auto">
            {filteredOrgs.map((org) => (
              <div
                key={org.id}
                className="group flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${ORG_TYPE_COLORS[org.type]}1a` }}
                >
                  <Building2 className="w-4 h-4" style={{ color: ORG_TYPE_COLORS[org.type] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-200 truncate leading-none mb-[3px]">
                    {org.name}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-none">
                    {org.city}, {org.state}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ORG_ACTIONS.map((a) => (
                    <ActionButton key={a.title} {...a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kanban pipeline */}
        <div className="bg-[#0a0e1a] rounded-xl border border-white/5 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 shrink-0">
            <h2 className="font-heading font-semibold text-[15px] text-white">Referral Pipeline</h2>
          </div>
          <div className="flex-1 p-4 grid grid-cols-4 gap-3 overflow-hidden">
            {kanbanGroups.map((col) => (
              <div key={col.status} className="flex flex-col gap-2 min-h-0">
                {/* Column header */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", col.dotClass)} />
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate flex-1">
                    {col.label}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 shrink-0">
                    {col.orgs.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="flex flex-col gap-1.5 overflow-y-auto flex-1">
                  {col.orgs.map((org) => (
                    <div
                      key={org.id}
                      className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer"
                      style={{ borderLeft: `2px solid ${col.accent}` }}
                    >
                      <p className="text-[11px] font-medium text-slate-200 leading-snug mb-[3px] truncate">
                        {org.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {org.city}, {org.state}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Channel breakdown + Donut + Activity ────────────────────── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Channel breakdown */}
        <div className="bg-[#0a0e1a] rounded-xl border border-white/5 p-5">
          <h2 className="font-heading font-semibold text-[15px] text-white mb-5">
            Outreach by Channel
          </h2>
          <div className="space-y-5">
            {channelStats.map((ch) => {
              const Icon = CHANNEL_ICONS[ch.channel];
              const color = CHANNEL_COLORS[ch.channel];
              const label = CHANNEL_LABELS[ch.channel];
              const barPct = maxSent > 0 ? Math.round((ch.sent / maxSent) * 100) : 0;
              const replyColor =
                ch.responseRate >= 50 ? "#22c55e" : ch.responseRate > 0 ? "#eab308" : "#475569";
              return (
                <div key={ch.channel}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}1a` }}
                    >
                      <Icon className="w-3 h-3" style={{ color }} />
                    </div>
                    <span className="text-[13px] font-medium text-slate-300 flex-1">{label}</span>
                    <span className="text-[12px] font-semibold text-slate-200 tabular-nums">
                      {ch.sent} sent
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums"
                      style={{ color: replyColor, backgroundColor: `${replyColor}1a` }}
                    >
                      {ch.responseRate}% reply
                    </span>
                  </div>
                  <AnimatedBar pct={barPct} color={color} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Donut chart */}
        <div className="bg-[#0a0e1a] rounded-xl border border-white/5 p-5">
          <h2 className="font-heading font-semibold text-[15px] text-white mb-4">
            Org Type Breakdown
          </h2>
          <div className="flex items-center justify-center gap-6">
            <div className="shrink-0">
              <DonutChart segments={donutSegments} />
            </div>
            <div className="flex flex-col gap-3">
              {donutSegments.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-[12px] text-slate-400 flex-1 whitespace-nowrap">
                    {seg.label}
                  </span>
                  <span className="text-[12px] font-bold text-slate-200 tabular-nums">
                    {seg.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-[#0a0e1a] rounded-xl border border-white/5 p-5 overflow-hidden">
          <h2 className="font-heading font-semibold text-[15px] text-white mb-4">
            Recent Activity
          </h2>
          <div>
            {activityItems.map((log, i) => {
              const Icon = CHANNEL_ICONS[log.channel];
              const color = CHANNEL_COLORS[log.channel];
              const org = orgById[log.org_id];
              const isLast = i === activityItems.length - 1;
              return (
                <div key={log.id} className="flex gap-3">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: 24 }}>
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center z-10 shrink-0"
                      style={{
                        backgroundColor: `${color}1a`,
                        border: `1.5px solid ${color}50`,
                      }}
                    >
                      <Icon className="w-[11px] h-[11px]" style={{ color }} />
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 bg-white/[0.05]" style={{ minHeight: 14 }} />
                    )}
                  </div>
                  {/* Content */}
                  <div className={cn("pb-4 flex-1 min-w-0", isLast && "pb-0")}>
                    <div className="flex items-start justify-between gap-2 mb-[3px]">
                      <p className="text-[12px] font-semibold text-slate-200 truncate leading-none">
                        {org?.name ?? "Unknown Org"}
                      </p>
                      <span className="text-[10px] text-slate-500 shrink-0 leading-none mt-0.5">
                        {timeAgo(log.sent_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {log.message_body}
                    </p>
                    {log.response_received && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-sm">
                        ✓ Response received
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
