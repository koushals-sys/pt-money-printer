"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart2,
  Building2,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Send,
  Settings,
  Target,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { useToast } from "@/lib/toast";
import OutreachModal from "@/components/OutreachModal";

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",      label: "Dashboard",      icon: LayoutDashboard },
  { href: "/find-partners",  label: "Find Partners",  icon: Target },
  { href: "/directory",      label: "Directory",      icon: Building2 },
  { href: "/outreach",       label: "Outreach",       icon: Send, badge: true },
  { href: "/analytics",      label: "Analytics",      icon: BarChart2 },
  { href: "/settings",       label: "Settings",       icon: Settings },
];

const ROLE_LABELS: Record<string, string> = {
  pt:         "Physical Therapist",
  admin:      "Admin",
  front_desk: "Front Desk",
  owner:      "Owner",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Layout({ children, pageTitle }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    currentUser,
    pendingCount,
    selectedOrg,
    isModalOpen,
    modalChannel,
    openModal,
    closeModal,
    addOutreachLog,
  } = useAppContext();

  const { showToast } = useToast();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleNewOutreach() {
    if (selectedOrg) {
      // Re-open the modal for the last selected org.
      openModal(selectedOrg, "email");
    } else {
      // No org in context — take the user to the directory to pick one.
      router.push("/directory");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07091a] text-white">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="w-[220px] shrink-0 flex flex-col border-r border-white/5"
        style={{ backgroundColor: "#0a0e1a" }}
      >
        {/* Logo */}
        <div className="px-5 py-[22px] border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_0_14px_rgba(59,130,246,0.55)]">
              <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading font-bold text-[15px] leading-none">
              <span className="text-white">Spry</span>
              <span className="text-blue-400"> Health</span>
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const active =
              pathname === href || (pathname?.startsWith(href + "/") ?? false);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-[9px] rounded-lg text-sm font-medium transition-all duration-150 border",
                  active
                    ? "bg-blue-500/10 text-blue-300 border-blue-500/20 shadow-[0_0_14px_rgba(59,130,246,0.12)]"
                    : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.04]"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    active
                      ? "text-blue-400"
                      : "text-slate-500 group-hover:text-slate-300"
                  )}
                />
                <span className="flex-1 truncate">{label}</span>
                {badge && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-[10px] font-semibold text-white shadow-[0_0_8px_rgba(59,130,246,0.45)]">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 pb-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.35)]">
              <span className="text-[11px] font-bold text-white">
                {initials(currentUser.name)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-slate-200 truncate leading-none mb-[3px]">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-slate-500 truncate leading-none">
                {ROLE_LABELS[currentUser.role] ?? currentUser.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] transition-all shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-[60px] shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-[#07091a]">
          <h1 className="font-heading font-semibold text-[17px] text-white tracking-tight">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/directory")}
              className="flex items-center gap-2 px-4 py-[7px] text-[13px] font-medium text-slate-300 border border-white/10 rounded-lg hover:border-white/20 hover:text-white hover:bg-white/[0.04] transition-all duration-150"
            >
              <Search className="w-3.5 h-3.5" />
              Find orgs
            </button>
            <button
              onClick={handleNewOutreach}
              className="flex items-center gap-2 px-4 py-[7px] text-[13px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.35)] hover:shadow-[0_0_26px_rgba(59,130,246,0.5)] transition-all duration-150"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              New outreach
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* ── App-level OutreachModal ───────────────────────────────────────── */}
      {isModalOpen && selectedOrg && (
        <OutreachModal
          org={selectedOrg}
          channel={modalChannel}
          onClose={closeModal}
          onSend={(payload) => {
            addOutreachLog(payload);
            showToast(
              `${payload.channel.charAt(0).toUpperCase() + payload.channel.slice(1)} sent to ${payload.org.name}`,
              "success"
            );
          }}
        />
      )}
    </div>
  );
}
