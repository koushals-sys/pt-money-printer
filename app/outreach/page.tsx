"use client";

import Layout from "@/components/Layout";
import { useAppContext } from "@/lib/context";
import { Mail, MessageSquare, Phone, Printer, Clock } from "lucide-react";
import type { OutreachChannel } from "@/types";
import { cn } from "@/lib/utils";

const CHANNEL_CONFIG: Record<OutreachChannel, { Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; label: string }> = {
  email: { Icon: Mail,          color: "#3b82f6", label: "Email" },
  sms:   { Icon: MessageSquare, color: "#22c55e", label: "SMS"   },
  phone: { Icon: Phone,         color: "#a855f7", label: "Phone" },
  fax:   { Icon: Printer,       color: "#f97316", label: "Fax"   },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OutreachPage() {
  const { outreachLogs, pendingCount, openModal, organizations } = useAppContext();

  const ORG_BY_ID = Object.fromEntries(organizations.map((o) => [o.id, o]));

  const sorted = [...outreachLogs].sort(
    (a, b) => b.sent_at.getTime() - a.sent_at.getTime()
  );

  return (
    <Layout pageTitle="Outreach">
      <div className="p-6 space-y-6">

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total sent",           value: outreachLogs.length },
            { label: "Awaiting response",    value: pendingCount },
            { label: "Response rate",        value: `${Math.round((outreachLogs.filter(l => l.response_received).length / Math.max(outreachLogs.length, 1)) * 100)}%` },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-[#0a0e1a] border border-white/[0.06] rounded-xl px-5 py-4"
            >
              <div className="text-[28px] font-heading font-bold text-slate-100 leading-none mb-1">
                {value}
              </div>
              <div className="text-[12px] text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Log table ──────────────────────────────────────────────────── */}
        <div className="bg-[#0a0e1a] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-heading font-semibold text-[15px] text-slate-100">
              Activity log
            </h2>
            {pendingCount > 0 && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {pendingCount} pending
              </span>
            )}
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                <Mail className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-[14px] font-medium text-slate-400 mb-1">No outreach yet</p>
              <p className="text-[12px] text-slate-600">
                Open the Directory and click an outreach button on any organization.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {sorted.map((log) => {
                const org = ORG_BY_ID[log.org_id];
                const ch = CHANNEL_CONFIG[log.channel];
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Channel icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${ch.color}15` }}
                    >
                      <ch.Icon className="w-3.5 h-3.5" style={{ color: ch.color }} />
                    </div>

                    {/* Org + preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold text-slate-200 truncate">
                          {org?.name ?? log.org_id}
                        </span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${ch.color}15`, color: ch.color }}
                        >
                          {ch.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-500 truncate">
                        {log.message_body.slice(0, 90)}…
                      </p>
                    </div>

                    {/* Time + response status */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1 text-[11px] text-slate-600">
                        <Clock className="w-3 h-3" />
                        {timeAgo(log.sent_at)}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          log.response_received
                            ? "bg-green-500/10 text-green-400"
                            : "bg-slate-500/10 text-slate-500"
                        )}
                      >
                        {log.response_received ? "Responded" : "No reply"}
                      </span>
                    </div>

                    {/* Follow-up button — visible on hover */}
                    {!log.response_received && org && (
                      <button
                        onClick={() => openModal(org, log.channel)}
                        className="shrink-0 px-3 py-1.5 text-[11px] font-medium text-blue-400 border border-blue-500/20 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-500/10 transition-all duration-150"
                      >
                        Follow up
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
