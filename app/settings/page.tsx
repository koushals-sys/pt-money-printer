"use client";

import React from "react";
import Link from "next/link";
import Layout from "@/components/Layout";
import { useAppContext } from "@/lib/context";
import { Bell, Building2, CreditCard, Lock, Plug, Users } from "lucide-react";

const SECTIONS: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; href?: string }[] = [
  {
    icon: Building2,
    title: "Clinic Profile",
    description: "Update your clinic's name, address, NPI, and branding.",
    href: "/settings/clinic-profile",
  },
  {
    icon: Users,
    title: "Team Members",
    description: "Invite staff, assign roles, and manage access levels.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure email and SMS alerts for referral activity.",
  },
  {
    icon: Plug,
    title: "Integrations",
    description: "Connect SPRY EMR, Documo fax, Twilio SMS, and more.",
  },
  {
    icon: Lock,
    title: "Security",
    description: "Manage password, two-factor authentication, and sessions.",
  },
  {
    icon: CreditCard,
    title: "Billing",
    description: "View subscription, usage, and payment methods.",
  },
];

export default function SettingsPage() {
  const { currentUser, currentClinic } = useAppContext();

  return (
    <Layout pageTitle="Settings">
      <div className="p-6 space-y-6 max-w-3xl">

        {/* ── Account summary ────────────────────────────────────────────── */}
        <div className="bg-[#0a0e1a] border border-white/[0.06] rounded-xl px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(59,130,246,0.35)]">
            <span className="text-[13px] font-bold text-white">
              {currentUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-100 leading-none mb-1">
              {currentUser.name}
            </p>
            <p className="text-[12px] text-slate-500">
              {currentUser.email} · {currentClinic.name}
            </p>
          </div>
          <span className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 capitalize">
            {currentUser.role}
          </span>
        </div>

        {/* ── Settings sections ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {SECTIONS.map(({ icon: Icon, title, description, href }) => {
            const cls = "text-left bg-[#0a0e1a] border border-white/[0.06] rounded-xl p-5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-150 group";
            const inner = (
              <>
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3 group-hover:border-white/10 transition-colors">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-[13px] font-semibold text-slate-200 mb-1">{title}</p>
                <p className="text-[12px] text-slate-500 leading-relaxed">{description}</p>
              </>
            );
            return href ? (
              <Link key={title} href={href} className={cls}>{inner}</Link>
            ) : (
              <button key={title} className={cls}>{inner}</button>
            );
          })}
        </div>

        <p className="text-[11px] text-slate-600 text-center">
          Full settings coming soon. Contact your clinic owner to make changes.
        </p>
      </div>
    </Layout>
  );
}
