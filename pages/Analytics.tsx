"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Mail,
  MessageSquare,
  Phone,
  Printer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgType, OutreachChannel, ReferralStatus } from "@/types";
import { useAppContext } from "@/lib/context";

// ─── Types ────────────────────────────────────────────────────────────────────

type DateRange = "week" | "month" | "3months" | "custom";
type SortCol = "name" | "type" | "patients" | "last_contact" | "status";
type SortDir = "asc" | "desc";

interface WeekData {
  label: string;
  weekStart: Date;
  email: number;
  sms: number;
  phone: number;
  fax: number;
  total: number;
}

interface FunnelStage {
  label: string;
  count: number;
  color: string;
  convPct: number | null;
}

interface TableRow {
  id: string;
  name: string;
  type: OrgType;
  city: string;
  state: string;
  patients: number;
  lastContact: Date | undefined;
  status: ReferralStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_COLORS: Record<OutreachChannel, string> = {
  email: "#3b82f6",
  sms:   "#22c55e",
  phone: "#eab308",
  fax:   "#a855f7",
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

const CHANNEL_AVG_TIME: Record<OutreachChannel, string> = {
  email: "2.4 days",
  sms:   "4.3 hrs",
  phone: "Same day",
  fax:   "3.1 days",
};

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  ortho:        "Ortho",
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

const STATUS_LABELS: Record<ReferralStatus, string> = {
  not_contacted: "Not Contacted",
  contacted:     "Contacted",
  follow_up:     "Follow Up",
  established:   "Established",
};

const STATUS_COLORS: Record<ReferralStatus, string> = {
  not_contacted: "#475569",
  contacted:     "#eab308",
  follow_up:     "#f97316",
  established:   "#22c55e",
};

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "week",    label: "This week" },
  { value: "month",   label: "This month" },
  { value: "3months", label: "Last 3 months" },
  { value: "custom",  label: "Custom" },
];

// ─── Data generation ──────────────────────────────────────────────────────────

function sr(seed: number, offset: number): number {
  const x = Math.sin(seed * 17.3 + offset * 7.1) * 100000;
  return (x - Math.floor(x));
}

const ALL_WEEKS: WeekData[] = Array.from({ length: 12 }, (_, i) => {
  const today = new Date("2026-04-27");
  const weeksBack = 11 - i;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - weeksBack * 7 - 6);

  const seed = i + 1;
  const email = Math.round(sr(seed, 1) * 4 + 2);   // 2–6
  const sms   = Math.round(sr(seed, 2) * 3);        // 0–3
  const phone = Math.round(sr(seed, 3) * 2);        // 0–2
  const fax   = Math.round(sr(seed, 4) * 2);        // 0–2
  const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;

  return { label, weekStart, email, sms, phone, fax, total: email + sms + phone + fax };
});


// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d?: Date): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function weeksForRange(range: DateRange, custom: { from: string; to: string }): WeekData[] {
  if (range === "week")    return ALL_WEEKS.slice(-1);
  if (range === "month")   return ALL_WEEKS.slice(-4);
  if (range === "3months") return ALL_WEEKS;
  // custom: filter by date (simplified)
  const from = custom.from ? new Date(custom.from) : ALL_WEEKS[0].weekStart;
  const to   = custom.to   ? new Date(custom.to)   : new Date("2026-04-27");
  return ALL_WEEKS.filter((w) => w.weekStart >= from && w.weekStart <= to);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OutreachBarChart({ data }: { data: WeekData[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const CHANNELS: { key: keyof Omit<WeekData, "label" | "weekStart" | "total">; ch: OutreachChannel }[] = [
    { key: "email", ch: "email" },
    { key: "sms",   ch: "sms"   },
    { key: "phone", ch: "phone" },
    { key: "fax",   ch: "fax"   },
  ];

  const VW = 800;
  const VH = 220;
  const PL = 44;
  const PR = 16;
  const PT = 16;
  const PB = 28;
  const areaW = VW - PL - PR;
  const areaH = VH - PT - PB;

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const yTicks = [0, Math.round(maxVal * 0.5), maxVal];

  const groupW = areaW / data.length;
  const barW = Math.min(13, (groupW - 10) / 4);
  const barGap = 2;
  const totalBarBlock = 4 * barW + 3 * barGap;

  return (
    <div className="relative">
      {/* Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute z-10 pointer-events-none"
          style={{
            left: `${PL + hoveredIdx * groupW + groupW / 2}px`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-[#0d1829] border border-white/10 rounded-xl px-3.5 py-3 shadow-xl min-w-[140px] mt-2">
            <div className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Week of {data[hoveredIdx].label}
            </div>
            {CHANNELS.map(({ key, ch }) => (
              <div key={ch} className="flex items-center justify-between gap-4 mb-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: CHANNEL_COLORS[ch] }}
                  />
                  <span className="text-[11px] text-slate-400">
                    {CHANNEL_LABELS[ch]}
                  </span>
                </div>
                <span
                  className="text-[12px] font-bold tabular-nums"
                  style={{ color: CHANNEL_COLORS[ch] }}
                >
                  {data[hoveredIdx][key]}
                </span>
              </div>
            ))}
            <div className="border-t border-white/[0.06] mt-2 pt-2 flex justify-between">
              <span className="text-[11px] text-slate-500">Total</span>
              <span className="text-[12px] font-bold text-white tabular-nums">
                {data[hoveredIdx].total}
              </span>
            </div>
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Gridlines + y-axis labels */}
        {yTicks.map((tick) => {
          const y = PT + areaH - (tick / maxVal) * areaH;
          return (
            <g key={tick}>
              <line
                x1={PL}
                y1={y}
                x2={VW - PR}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
              <text
                x={PL - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="#475569"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bar groups */}
        {data.map((week, wi) => {
          const groupX = PL + wi * groupW;
          const cx = groupX + groupW / 2;
          const startX = cx - totalBarBlock / 2;
          const isHovered = hoveredIdx === wi;

          return (
            <g
              key={week.label}
              onMouseEnter={() => setHoveredIdx(wi)}
            >
              {/* Hover hit area */}
              <rect
                x={groupX}
                y={PT}
                width={groupW}
                height={areaH}
                fill={isHovered ? "rgba(255,255,255,0.025)" : "transparent"}
                rx={4}
              />
              {CHANNELS.map(({ key, ch }, ci) => {
                const val = week[key] as number;
                const bh = Math.max(val / maxVal * areaH, val > 0 ? 2 : 0);
                const bx = startX + ci * (barW + barGap);
                const by = PT + areaH - bh;
                return (
                  <rect
                    key={ch}
                    x={bx}
                    y={by}
                    width={barW}
                    height={bh}
                    rx={2}
                    fill={CHANNEL_COLORS[ch]}
                    opacity={isHovered || hoveredIdx === null ? 1 : 0.45}
                    style={{ transition: "opacity 0.12s" }}
                  />
                );
              })}
              {/* X label */}
              <text
                x={cx}
                y={VH - 6}
                textAnchor="middle"
                fontSize={9}
                fill={isHovered ? "#94a3b8" : "#475569"}
              >
                {week.label}
              </text>
            </g>
          );
        })}

        {/* X axis line */}
        <line
          x1={PL}
          y1={PT + areaH}
          x2={VW - PR}
          y2={PT + areaH}
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={1}
        />
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 justify-end mt-1 px-4">
        {CHANNELS.map(({ ch }) => (
          <div key={ch} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: CHANNEL_COLORS[ch] }}
            />
            <span className="text-[11px] text-slate-500">{CHANNEL_LABELS[ch]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineFunnel() {
  const { organizations } = useAppContext();
  const stages: FunnelStage[] = useMemo(() => {
    const d = organizations.length;
    const c = organizations.filter((o) => o.referral_status !== "not_contacted").length;
    const f = organizations.filter((o) => ["follow_up", "established"].includes(o.referral_status)).length;
    const e = organizations.filter((o) => o.referral_status === "established").length;
    const p = 34;
    return [
      { label: "Orgs Discovered",    count: d, color: "#3b82f6", convPct: null },
      { label: "Contacted",          count: c, color: "#a855f7", convPct: d > 0 ? Math.round((c / d) * 100) : null },
      { label: "Follow-up Stage",    count: f, color: "#eab308", convPct: c > 0 ? Math.round((f / c) * 100) : null },
      { label: "Established",        count: e, color: "#22c55e", convPct: f > 0 ? Math.round((e / f) * 100) : null },
      { label: "Patients Scheduled", count: p, color: "#14b8a6", convPct: null },
    ];
  }, [organizations]);
  const MAX_W = 360;
  const CX = 260;
  const BAR_H = 54;
  const GAP = 6;
  const SVG_W = 580;
  const pipelineStages = stages.slice(0, 4);
  const svgH = pipelineStages.length * (BAR_H + GAP) + 20;

  function stageW(count: number): number {
    return MAX_W * Math.max(0.36, count / stages[0].count);
  }

  return (
    <div className="space-y-5">
      <svg viewBox={`0 0 ${SVG_W} ${svgH + 10}`} className="w-full overflow-visible">
        {pipelineStages.map((stage, i) => {
          const w = stageW(stage.count);
          const y = i * (BAR_H + GAP) + 10;
          const nextStage = pipelineStages[i + 1];

          return (
            <g key={stage.label}>
              {/* Trapezoid connector to next stage */}
              {nextStage && (() => {
                const nw = stageW(nextStage.count);
                const ny = (i + 1) * (BAR_H + GAP) + 10;
                return (
                  <polygon
                    points={[
                      `${CX - w / 2},${y + BAR_H}`,
                      `${CX + w / 2},${y + BAR_H}`,
                      `${CX + nw / 2},${ny}`,
                      `${CX - nw / 2},${ny}`,
                    ].join(" ")}
                    fill={`${stage.color}08`}
                    stroke="none"
                  />
                );
              })()}

              {/* Stage bar */}
              <rect
                x={CX - w / 2}
                y={y}
                width={w}
                height={BAR_H}
                rx={7}
                fill={`${stage.color}18`}
                stroke={stage.color}
                strokeOpacity={0.4}
                strokeWidth={1.5}
              />

              {/* Count */}
              <text
                x={CX}
                y={y + BAR_H / 2 + 8}
                textAnchor="middle"
                fontSize={20}
                fontWeight="700"
                fill={stage.color}
                fontFamily="var(--font-syne)"
              >
                {stage.count}
              </text>

              {/* Stage label (right) */}
              <text
                x={CX + w / 2 + 14}
                y={y + BAR_H / 2 + 5}
                fontSize={12}
                fill="#94a3b8"
                fontFamily="var(--font-dm-sans)"
              >
                {stage.label}
              </text>

              {/* Conversion % (left) */}
              {stage.convPct !== null && (
                <text
                  x={CX - w / 2 - 12}
                  y={y + BAR_H / 2 + 5}
                  textAnchor="end"
                  fontSize={11}
                  fontWeight="600"
                  fill="#64748b"
                  fontFamily="var(--font-dm-sans)"
                >
                  ↓ {stage.convPct}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Patients output row */}
      <div
        className="flex items-center gap-3 rounded-xl p-4 border"
        style={{
          backgroundColor: `${stages[4].color}0e`,
          borderColor: `${stages[4].color}30`,
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-heading font-bold text-[18px]"
          style={{
            backgroundColor: `${stages[4].color}20`,
            color: stages[4].color,
          }}
        >
          {stages[4].count}
        </div>
        <div>
          <div
            className="text-[13px] font-semibold"
            style={{ color: stages[4].color }}
          >
            Patients Scheduled
          </div>
          <div className="text-[11px] text-slate-500">
            ~{(stages[4].count / Math.max(stages[3].count, 1)).toFixed(1)} per
            established partner
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[11px] text-slate-500">from</div>
          <div className="text-[13px] font-semibold text-slate-300">
            {stages[3].count} established
          </div>
        </div>
      </div>
    </div>
  );
}

function ChannelCards({ data = ALL_WEEKS }: { data?: WeekData[] }) {
  const weeks = data;
  const channels: OutreachChannel[] = ["email", "sms", "phone", "fax"];

  // Realistic response rates per channel
  const RESPONSE_RATES: Record<OutreachChannel, number> = {
    email: 0.27,
    sms:   0.15,
    phone: 0.82,
    fax:   0.10,
  };
  const CONVERSION_RATES: Record<OutreachChannel, number> = {
    email: 0.12,
    sms:   0.06,
    phone: 0.34,
    fax:   0.05,
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {channels.map((ch) => {
        const Icon = CHANNEL_ICONS[ch];
        const color = CHANNEL_COLORS[ch];
        const sent = weeks.reduce((s, w) => s + (w[ch] as number), 0);
        const responded = Math.round(sent * RESPONSE_RATES[ch]);
        const conversions = Math.round(sent * CONVERSION_RATES[ch]);
        const rate = RESPONSE_RATES[ch];

        return (
          <div
            key={ch}
            className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-5"
            style={{ borderTop: `2px solid ${color}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}1a` }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span
                className="text-[11px] font-semibold px-2 py-1 rounded-full"
                style={{ backgroundColor: `${color}15`, color }}
              >
                {CHANNEL_LABELS[ch]}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[28px] font-heading font-bold text-slate-100 leading-none">
                  {sent}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">sent</div>
              </div>

              <div className="h-px bg-white/[0.05]" />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[16px] font-heading font-bold" style={{ color }}>
                    {responded}
                  </div>
                  <div className="text-[10px] text-slate-500">responded</div>
                </div>
                <div>
                  <div className="text-[16px] font-heading font-bold" style={{ color }}>
                    {conversions}
                  </div>
                  <div className="text-[10px] text-slate-500">converted</div>
                </div>
              </div>

              {/* Response rate bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-slate-500">Response rate</span>
                  <span
                    className="text-[11px] font-bold tabular-nums"
                    style={{ color }}
                  >
                    {Math.round(rate * 100)}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${rate * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <span className="text-[10px] text-slate-500">Avg response</span>
                <span className="text-[11px] font-medium text-slate-300">
                  {CHANNEL_AVG_TIME[ch]}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-blue-400" />
    : <ChevronDown className="w-3 h-3 text-blue-400" />;
}

function ReferralTable() {
  const { organizations } = useAppContext();
  const [sortCol, setSortCol] = useState<SortCol>("patients");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const tableData: TableRow[] = useMemo(() =>
    organizations
      .filter((o) => o.referral_status !== "not_contacted")
      .map((o) => {
        const seed = o.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const r = sr(seed, 5);
        const patients =
          o.referral_status === "established" ? Math.round(r * 15 + 8)
          : o.referral_status === "follow_up"  ? Math.round(r * 5)
          : 0;
        return { id: o.id, name: o.name, type: o.type, city: o.city, state: o.state, patients, lastContact: o.last_contacted_at, status: o.referral_status };
      }),
  [organizations]);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    return [...tableData].sort((a, b) => {
      let cmp = 0;
      if (sortCol === "name")    cmp = a.name.localeCompare(b.name);
      if (sortCol === "type")    cmp = a.type.localeCompare(b.type);
      if (sortCol === "patients") cmp = a.patients - b.patients;
      if (sortCol === "last_contact") {
        cmp = (a.lastContact?.getTime() ?? 0) - (b.lastContact?.getTime() ?? 0);
      }
      if (sortCol === "status")  cmp = a.status.localeCompare(b.status);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [tableData, sortCol, sortDir]);

  const cols: { key: SortCol; label: string; align?: "right" }[] = [
    { key: "name",         label: "Organization" },
    { key: "type",         label: "Type" },
    { key: "patients",     label: "Patients", align: "right" },
    { key: "last_contact", label: "Last Contact" },
    { key: "status",       label: "Status" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02]">
            {cols.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none",
                  col.align === "right" ? "text-right" : "text-left"
                )}
                onClick={() => handleSort(col.key)}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5",
                    col.align === "right" && "justify-end"
                  )}
                >
                  {col.label}
                  <SortIcon active={sortCol === col.key} dir={sortDir} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {sorted.map((row) => {
            const typeColor = ORG_TYPE_COLORS[row.type];
            const statusColor = STATUS_COLORS[row.status];
            return (
              <tr
                key={row.id}
                className="hover:bg-white/[0.025] transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="text-[13px] font-medium text-slate-200 truncate max-w-[200px]">
                    {row.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {row.city}, {row.state}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${typeColor}15`,
                      color: typeColor,
                    }}
                  >
                    {ORG_TYPE_LABELS[row.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-[14px] font-heading font-bold text-slate-200 tabular-nums">
                    {row.patients > 0 ? row.patients : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] text-slate-400">
                  {formatDate(row.lastContact)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${statusColor}15`,
                      color: statusColor,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: statusColor }}
                    />
                    {STATUS_LABELS[row.status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Analytics() {
  const [range, setRange] = useState<DateRange>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });

  const weeks = useMemo(() => weeksForRange(range, custom), [range, custom]);

  const totals = useMemo(() => ({
    email: weeks.reduce((s, w) => s + w.email, 0),
    sms:   weeks.reduce((s, w) => s + w.sms,   0),
    phone: weeks.reduce((s, w) => s + w.phone, 0),
    fax:   weeks.reduce((s, w) => s + w.fax,   0),
    total: weeks.reduce((s, w) => s + w.total, 0),
  }), [weeks]);

  return (
    <div className="p-6 space-y-6">
      {/* ── Date range selector ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-lg p-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={cn(
                "px-4 py-1.5 rounded-md text-[13px] font-medium transition-all",
                range === opt.value
                  ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.35)]"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              className="h-9 bg-[#0d1220] border border-white/[0.08] text-slate-300 text-[13px] rounded-lg px-3 focus:outline-none focus:border-blue-500/40"
            />
            <span className="text-slate-600 text-[13px]">→</span>
            <input
              type="date"
              value={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="h-9 bg-[#0d1220] border border-white/[0.08] text-slate-300 text-[13px] rounded-lg px-3 focus:outline-none focus:border-blue-500/40"
            />
          </div>
        )}

        <div className="ml-auto text-[13px] text-slate-500">
          <span className="font-semibold text-slate-300 tabular-nums">{totals.total}</span>
          {" "}outreach actions in period
        </div>
      </div>

      {/* ── Bar chart ──────────────────────────────────────────────────────── */}
      <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-5">
        <h2 className="font-heading font-semibold text-[15px] text-white mb-5">
          Outreach Volume
        </h2>
        <OutreachBarChart data={weeks} />
      </div>

      {/* ── Funnel + Table ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_1.6fr] gap-5">
        <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-5">
          <h2 className="font-heading font-semibold text-[15px] text-white mb-5">
            Referral Pipeline
          </h2>
          <PipelineFunnel />
        </div>
        <div className="bg-[#0a0e1a] rounded-xl border border-white/[0.06] p-5">
          <h2 className="font-heading font-semibold text-[15px] text-white mb-5">
            Top Referral Sources
          </h2>
          <ReferralTable />
        </div>
      </div>

      {/* ── Channel performance ────────────────────────────────────────────── */}
      <div>
        <h2 className="font-heading font-semibold text-[15px] text-white mb-4">
          Channel Performance
        </h2>
        <ChannelCards data={weeks} />
      </div>
    </div>
  );
}
