"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Mail,
  MessageSquare,
  Phone,
  Printer,
  Send,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import type { ClinicProfile, Organization, OutreachChannel } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateKey = "introductory" | "follow_up" | "re_engagement";

interface Template {
  label: string;
  subject?: string;
  body: string;
}

export interface OutreachModalProps {
  org: Organization;
  channel: OutreachChannel;
  onClose: () => void;
  onSend: (payload: {
    org: Organization;
    channel: OutreachChannel;
    template: TemplateKey;
    subject?: string;
    body: string;
    attachCredentials?: boolean;
  }) => void;
}

// ─── Static dummy PT user ────────────────────────────────────────────────────

const PT_USER = {
  name: "Dr. Sarah Mitchell",
  credential: "DPT",
  phone: "(512) 555-0142",
  fax: "(512) 555-0143",
};

const TODAY_DISPLAY = "April 27, 2026";

// ─── Channel config ───────────────────────────────────────────────────────────

const CHANNEL_CONFIG: Record<
  OutreachChannel,
  { label: string; Icon: LucideIcon; color: string }
> = {
  email: { label: "Email",  Icon: Mail,          color: "#3b82f6" },
  sms:   { label: "SMS",    Icon: MessageSquare, color: "#22c55e" },
  phone: { label: "Phone",  Icon: Phone,          color: "#a855f7" },
  fax:   { label: "Fax",    Icon: Printer,        color: "#f97316" },
};

const CHANNEL_ORDER: OutreachChannel[] = ["email", "sms", "phone", "fax"];

const TEMPLATE_OPTIONS: { value: TemplateKey; label: string }[] = [
  { value: "introductory", label: "Introductory" },
  { value: "follow_up",    label: "Follow-up" },
  { value: "re_engagement", label: "Re-engagement" },
];

// ─── Template builder ─────────────────────────────────────────────────────────

function buildTemplates(
  orgName: string,
  clinic: ClinicProfile
): Record<OutreachChannel, Record<TemplateKey, Template>> {
  const clinicName = clinic.name;
  const { name: ptName, credential, phone: ptPhone, fax: ptFax } = PT_USER;
  const insurances = clinic.insurances_accepted;
  const insList = insurances.length > 1
    ? insurances.slice(0, -1).join(", ") + ", and " + insurances.at(-1)
    : insurances[0] ?? "major insurers";
  const sig = `${ptName}, ${credential}\n${clinicName} | ${clinic.city}, ${clinic.state} | ${ptPhone}`;

  return {
    email: {
      introductory: {
        label: "Introductory",
        subject: `Introducing ${clinicName} — Physician Referral Partnership`,
        body: `Dear ${orgName} Team,

My name is ${ptName}, ${credential}, Clinical Director at ${clinicName} in ${clinic.city}, TX. I am writing to introduce our practice and explore a formal physician referral partnership with ${orgName}.

At ${clinicName}, we specialize in post-surgical rehabilitation, sports injuries, and musculoskeletal conditions — including ACL reconstruction, rotator cuff repair, lower back pain, and total joint replacement recovery. Our team achieves an average patient recovery timeline of ${clinic.avg_recovery_days} days, and we hold an NPS score of ${clinic.nps_score}.

We accept ${insList}, which covers the majority of your patients' insurance plans. New referral patients can typically be scheduled within 48 business hours of receipt.

I would welcome the opportunity to connect at your convenience for a brief introductory call. You can reach me directly at ${ptPhone} or by replying to this message. Our NPI number is ${clinic.npi_number}.

Thank you for your time.

Warm regards,
${sig}`,
      },
      follow_up: {
        label: "Follow-up",
        subject: `Following Up: PT Referral Partnership — ${clinicName}`,
        body: `Dear ${orgName} Team,

I wanted to follow up on my previous message regarding a potential referral partnership between ${orgName} and ${clinicName}.

We continue to have strong capacity for new patients and are actively building our physician referral network. As a reminder, we accept Medicare, Medicaid, ${insurances.slice(0, 3).join(", ")}, and Cigna — covering the majority of your patients' plans — and can schedule new referrals within 48 hours.

If you have had a chance to review our information, I would be happy to address any questions about our services, outcomes, or the referral process. A 10-minute call is often all it takes to determine if there's a good fit.

I appreciate your time and look forward to hearing from you.

Best regards,
${sig}`,
      },
      re_engagement: {
        label: "Re-engagement",
        subject: `Reconnecting — Physical Therapy Services at ${clinicName}`,
        body: `Dear ${orgName} Team,

It has been some time since we last connected, and I wanted to reach out to reconnect and share some updates from ${clinicName}.

Over the past year, we have expanded our services to include advanced return-to-sport protocols and post-operative care for hip and knee replacements. We have also added extended evening hours to better accommodate working patients referred by your practice.

We continue to accept ${insList} and remain committed to timely access — typically within 48 hours of a physician referral. Our NPI (${clinic.npi_number}) is on file with all major payers for seamless claims processing.

I would love to reconnect and explore how we can better support your patients. Please feel free to reach out at ${ptPhone} or reply to this email.

Warm regards,
${sig}`,
      },
    },

    sms: {
      introductory: {
        label: "Introductory",
        body: `Hi, this is ${ptName} from ${clinicName} in ${clinic.city}, TX. We're expanding our physician referral network and would love to connect with ${orgName}. We accept Medicare, Aetna, BCBS & more. Can we schedule a quick call? ${ptPhone}`,
      },
      follow_up: {
        label: "Follow-up",
        body: `Hi! Following up from ${clinicName} (${clinic.city}, TX). Still interested in a PT referral partnership with ${orgName}? We have immediate availability and accept Medicare + major insurers. – ${ptName}, ${credential} ${ptPhone}`,
      },
      re_engagement: {
        label: "Re-engagement",
        body: `Hi, ${ptName} from ${clinicName} again. We'd love to reconnect with ${orgName} about PT referrals. We've expanded our services and still accept Medicare, Aetna & BCBS. Reply or call ${ptPhone}.`,
      },
    },

    phone: {
      introductory: {
        label: "Introductory",
        body: `CALL SCRIPT — Introductory

Opening (to receptionist):
"Hi, my name is ${ptName}. I'm a Doctor of Physical Therapy at ${clinicName} in Austin. May I speak with your referral coordinator or office manager regarding a referral partnership opportunity?"

When connected:
"Hello, thank you for taking my call. I'm reaching out to introduce ${clinicName} and discuss establishing a referral relationship with ${orgName}.

We specialize in post-surgical rehab, orthopedic care, and sports injuries. We accept Medicare, Medicaid, Aetna, Blue Cross Blue Shield, UnitedHealthcare, and Cigna, and can typically schedule new patients within 48 hours of receiving a referral.

Would you or your referring physicians be open to a brief 10-minute call this week to learn more about how we might support your patients?"

Closing:
"Wonderful. My direct number is ${ptPhone} and our NPI is ${clinic.npi_number}. I'll also follow up by email. Thank you so much for your time."`,
      },
      follow_up: {
        label: "Follow-up",
        body: `CALL SCRIPT — Follow-up

Opening:
"Hi, this is ${ptName} calling from ${clinicName} in Austin — I'm following up on a previous inquiry about a PT referral partnership with ${orgName}."

Main message:
"I wanted to check in and see if you had a chance to review the information we sent over. I'm happy to answer any questions about our services, outcomes, or how our referral process works.

To recap — we accept Medicare, Medicaid, ${insurances.slice(0, 3).join(", ")}, and Cigna, and we can see new referral patients within 48 hours. Our average recovery timeline is ${clinic.avg_recovery_days} days."

Closing:
"Is there a convenient time this week to connect for 10 minutes? My direct line is ${ptPhone}. Thank you!"`,
      },
      re_engagement: {
        label: "Re-engagement",
        body: `CALL SCRIPT — Re-engagement

Opening:
"Hi, this is ${ptName} from ${clinicName} in Austin. I'm reaching out to reconnect with ${orgName} — it's been a while since we last spoke about a potential PT referral arrangement."

Main message:
"I wanted to share a few updates. We've recently expanded our services to include advanced sports rehabilitation and post-operative hip and knee protocols, and we've added evening availability for working patients.

We still maintain full Medicare and major commercial insurance acceptance, and our NPI (${clinic.npi_number}) is active with all major payers."

Closing:
"I'd love to reconnect and see how we can support your patients. Would you or your referral coordinator have 10 minutes available this week? My number is ${ptPhone}. Thank you for your time."`,
      },
    },

    fax: {
      introductory: {
        label: "Introductory",
        body: `FACSIMILE TRANSMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TO:    ${orgName} — Referral Coordinator
FROM:  ${clinicName} — ${ptName}, ${credential}
FAX:   ${ptFax}
DATE:  ${TODAY_DISPLAY}
RE:    Physical Therapy Referral Partnership Inquiry
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${orgName} Team,

We are writing to introduce ${clinicName}, a physical therapy practice located at ${clinic.address}, ${clinic.city}, TX ${clinic.zip}, and to invite your organization to consider a referral partnership.

SERVICES WE PROVIDE:
  • Post-surgical rehabilitation (ACL, rotator cuff, joint replacement)
  • Orthopedic and sports injury rehabilitation
  • Lower back and spine conditions
  • Average recovery timeline: ${clinic.avg_recovery_days} days
  • NPS Score: ${clinic.nps_score}/100

INSURANCE ACCEPTED:
  • Medicare & Medicaid
  • ${insurances.join("\n  • ")}

OUR REFERRAL PROCESS:
  • New patients scheduled within 48 hours of referral receipt
  • Fax referrals to: ${ptFax}
  • NPI Number: ${clinic.npi_number}

We welcome the opportunity to discuss how we can best serve your patients. Please contact us at ${ptPhone}.

Sincerely,
${ptName}, ${credential}
Clinical Director — ${clinicName}`,
      },
      follow_up: {
        label: "Follow-up",
        body: `FACSIMILE TRANSMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TO:    ${orgName} — Referral Coordinator
FROM:  ${clinicName} — ${ptName}, ${credential}
FAX:   ${ptFax}
DATE:  ${TODAY_DISPLAY}
RE:    Follow-Up: Physical Therapy Referral Partnership
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${orgName} Team,

This fax serves as a follow-up to our previous outreach regarding a referral partnership between ${orgName} and ${clinicName}.

We remain committed to providing your patients with exceptional physical therapy care and continue to accept ${insList}.

We can schedule new referral patients within 48 hours and process claims through all major payers using NPI ${clinic.npi_number}.

Please do not hesitate to contact us at ${ptPhone} with any questions. We look forward to hearing from you.

Sincerely,
${ptName}, ${credential}
Clinical Director — ${clinicName}`,
      },
      re_engagement: {
        label: "Re-engagement",
        body: `FACSIMILE TRANSMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TO:    ${orgName} — Referral Coordinator
FROM:  ${clinicName} — ${ptName}, ${credential}
FAX:   ${ptFax}
DATE:  ${TODAY_DISPLAY}
RE:    Reconnecting — PT Referral Services Update
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear ${orgName} Team,

We are reaching out to reconnect with ${orgName} and share updates from ${clinicName} since our last correspondence.

RECENT UPDATES:
  • Expanded sports rehabilitation and return-to-play protocols
  • Added post-operative hip and knee replacement care pathways
  • Extended evening appointment availability
  • Continued acceptance of Medicare, Medicaid & major commercial plans

We remain dedicated to timely access for physician-referred patients (typically within 48 hours) and welcome the chance to discuss how we can better support ${orgName}'s patients.

Please contact us at ${ptPhone} or fax ${ptFax}. NPI: ${clinic.npi_number}.

Sincerely,
${ptName}, ${credential}
Clinical Director — ${clinicName}`,
      },
    },
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OutreachModal({
  org,
  channel: initialChannel,
  onClose,
  onSend,
}: OutreachModalProps) {
  const { currentClinic } = useAppContext();
  const [activeChannel, setActiveChannel] = useState<OutreachChannel>(initialChannel);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("introductory");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachCredentials, setAttachCredentials] = useState(false);
  const [sending, setSending] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [visible, setVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const templates = buildTemplates(org.name, currentClinic);

  // Slide in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Re-fill fields when channel or template changes
  useEffect(() => {
    const t = templates[activeChannel][selectedTemplate];
    setBody(t.body);
    setSubject(t.subject ?? "");
    setAttachCredentials(false);
    textareaRef.current?.scrollTo({ top: 0 });
  }, [activeChannel, selectedTemplate]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChannelChange(ch: OutreachChannel) {
    setActiveChannel(ch);
    setSelectedTemplate("introductory");
  }

  function handleSend() {
    setSending(true);
    setTimeout(() => {
      const payload = {
        org,
        channel: activeChannel,
        template: selectedTemplate,
        ...(activeChannel === "email" ? { subject } : {}),
        body,
        ...(activeChannel === "fax" ? { attachCredentials } : {}),
      };
      console.log("[OutreachModal] Send:", payload);
      onSend(payload);
      setSending(false);
      setShowToast(true);
    }, 600);
  }

  // After toast shows, close the modal
  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 1600);
    return () => clearTimeout(t);
  }, [showToast, onClose]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  const chCfg = CHANNEL_CONFIG[activeChannel];
  const isSms = activeChannel === "sms";
  const isEmail = activeChannel === "email";
  const isFax = activeChannel === "fax";

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[500px] flex flex-col",
          "bg-[#0a0e1a] border-l border-white/[0.07] shadow-2xl",
          "transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* ── Success toast ──────────────────────────────────────────────── */}
        <div
          className={cn(
            "absolute top-4 left-4 right-4 z-10",
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "bg-green-500/15 border border-green-500/30",
            "transition-all duration-300",
            showToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
          )}
        >
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span className="text-[13px] font-medium text-green-300">
            {chCfg.label} sent to {org.name}
          </span>
        </div>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/[0.06] shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-heading font-semibold text-[16px] text-white truncate">
              {org.name}
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {org.city}, {org.state} · {org.type.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/[0.15] hover:bg-white/[0.04] transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Channel tabs ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 px-4 py-3 border-b border-white/[0.06] shrink-0">
          {CHANNEL_ORDER.map((ch) => {
            const cfg = CHANNEL_CONFIG[ch];
            const active = activeChannel === ch;
            return (
              <button
                key={ch}
                onClick={() => handleChannelChange(ch)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-all duration-150 flex-1 justify-center",
                  active
                    ? "border-opacity-30 text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
                )}
                style={
                  active
                    ? {
                        backgroundColor: `${cfg.color}15`,
                        borderColor: `${cfg.color}35`,
                        color: cfg.color,
                      }
                    : undefined
                }
              >
                <cfg.Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Template selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Template
            </label>
            <div className="relative">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as TemplateKey)}
                className="w-full h-9 appearance-none bg-[#0d1220] border border-white/[0.08] text-slate-200 text-[13px] rounded-lg pl-3 pr-8 focus:outline-none focus:border-blue-500/40 hover:border-white/[0.14] transition-colors cursor-pointer"
              >
                {TEMPLATE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Subject line (email only) */}
          {isEmail && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-9 bg-[#0d1220] border border-white/[0.08] text-slate-200 text-[13px] rounded-lg px-3 focus:outline-none focus:border-blue-500/40 hover:border-white/[0.14] transition-colors placeholder:text-slate-600"
                placeholder="Email subject…"
              />
            </div>
          )}

          {/* Message body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {activeChannel === "phone" ? "Call Script" : "Message"}
              </label>
              {isSms && (
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums",
                    body.length > 160 ? "text-red-400" : "text-slate-500"
                  )}
                >
                  {body.length} / 160
                </span>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="w-full bg-[#0d1220] border border-white/[0.08] text-slate-200 text-[12.5px] leading-relaxed rounded-lg px-3.5 py-3 focus:outline-none focus:border-blue-500/40 hover:border-white/[0.14] transition-colors resize-none font-mono placeholder:text-slate-600 scrollbar-thin"
              placeholder="Message body…"
              spellCheck={activeChannel !== "phone"}
            />
          </div>

          {/* Attach credentials (fax only) */}
          {isFax && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={attachCredentials}
                  onChange={(e) => setAttachCredentials(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={cn(
                    "w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center shrink-0",
                    attachCredentials
                      ? "bg-blue-600 border-blue-600"
                      : "bg-transparent border-white/[0.2] group-hover:border-white/[0.35]"
                  )}
                >
                  {attachCredentials && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[13px] font-medium text-slate-300 leading-none">
                  Attach clinic credentials PDF
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Includes NPI, insurance contracts, and provider bio
                </p>
              </div>
            </label>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center gap-3 shrink-0">
          <button
            onClick={handleClose}
            className="flex-1 h-10 text-[13px] font-medium text-slate-400 border border-white/[0.08] rounded-lg hover:text-slate-200 hover:border-white/[0.15] hover:bg-white/[0.03] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || showToast || !body.trim()}
            className={cn(
              "flex-[2] h-10 flex items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition-all duration-150",
              "text-white shadow-[0_0_18px_rgba(59,130,246,0.3)] hover:shadow-[0_0_26px_rgba(59,130,246,0.45)]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
              sending || showToast
                ? "bg-blue-600/60"
                : "bg-blue-600 hover:bg-blue-500"
            )}
            style={
              !sending && !showToast
                ? { backgroundColor: chCfg.color, boxShadow: `0 0 18px ${chCfg.color}50` }
                : undefined
            }
          >
            {sending ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Send {chCfg.label}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
