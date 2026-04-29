"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ClinicProfile, Organization, OutreachChannel, OutreachLog, User } from "@/types";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OutreachSendPayload {
  org: Organization;
  channel: OutreachChannel;
  template: string;
  subject?: string;
  body: string;
  attachCredentials?: boolean;
}

interface AppContextValue {
  currentUser: User;
  currentClinic: ClinicProfile;
  organizations: Organization[];
  outreachLogs: OutreachLog[];
  pendingCount: number;
  selectedOrg: Organization | null;
  isModalOpen: boolean;
  modalChannel: OutreachChannel;
  openModal: (org: Organization, channel?: OutreachChannel) => void;
  closeModal: () => void;
  addOutreachLog: (payload: OutreachSendPayload) => void;
  updateClinic: (updates: Partial<ClinicProfile>) => Promise<void>;
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────

const GUEST_USER: User = { id: "", name: "", email: "", role: "owner", clinic_id: "" };

const GUEST_CLINIC: ClinicProfile = {
  id: "", name: "", address: "", city: "", state: "", zip: "",
  npi_number: "", nps_score: 0, injury_types: [], insurances_accepted: [], avg_recovery_days: 0,
};

// ─── Row converters ───────────────────────────────────────────────────────────

type OrgRow = Database["public"]["Tables"]["organizations"]["Row"];
type LogRow = Database["public"]["Tables"]["outreach_logs"]["Row"];

function rowToOrg(row: OrgRow): Organization {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    phone: row.phone,
    fax: row.fax ?? "",
    email: row.email ?? "",
    npi_number: row.npi_number ?? "",
    distance_miles: row.distance_miles !== null ? Number(row.distance_miles) : undefined,
    is_on_spry: row.is_on_spry,
    referral_status: row.referral_status,
    last_contacted_at: row.last_contacted_at ? new Date(row.last_contacted_at) : undefined,
  };
}

function rowToLog(row: LogRow): OutreachLog {
  return {
    id: row.id,
    org_id: row.org_id,
    channel: row.channel,
    sent_at: new Date(row.sent_at),
    sent_by: row.sent_by,
    message_body: row.message_body,
    response_received: row.response_received,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialClinic?: ClinicProfile | null;
}

export function AppProvider({ children, initialUser, initialClinic }: AppProviderProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [outreachLogs, setOutreachLogs] = useState<OutreachLog[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalChannel, setModalChannel] = useState<OutreachChannel>("email");

  const currentUser = initialUser ?? GUEST_USER;
  const [currentClinic, setCurrentClinic] = useState<ClinicProfile>(initialClinic ?? GUEST_CLINIC);

  // Fetch real data from Supabase when clinic is known
  useEffect(() => {
    if (!currentClinic.id) return;
    const supabase = createClient();

    supabase
      .from("organizations")
      .select("*")
      .eq("clinic_id", currentClinic.id)
      .order("name")
      .then(({ data }) => { if (data) setOrganizations(data.map(rowToOrg)); });

    supabase
      .from("outreach_logs")
      .select("*")
      .eq("clinic_id", currentClinic.id)
      .order("sent_at", { ascending: false })
      .then(({ data }) => { if (data) setOutreachLogs(data.map(rowToLog)); });
  }, [currentClinic.id]);

  const openModal = useCallback(
    (org: Organization, channel: OutreachChannel = "email") => {
      setSelectedOrg(org);
      setModalChannel(channel);
      setIsModalOpen(true);
    },
    []
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedOrg(null), 350);
  }, []);

  const addOutreachLog = useCallback(
    (payload: OutreachSendPayload) => {
      const newLog: OutreachLog = {
        id: `log-${Date.now()}`,
        org_id: payload.org.id,
        channel: payload.channel,
        sent_at: new Date(),
        sent_by: currentUser.id,
        message_body: payload.body,
        response_received: false,
      };
      setOutreachLogs((prev) => [newLog, ...prev]);

      // Persist to Supabase (silently skips if org isn't saved to DB yet)
      if (currentClinic.id && currentUser.id) {
        const supabase = createClient();
        supabase.from("outreach_logs").insert({
          org_id: payload.org.id,
          clinic_id: currentClinic.id,
          channel: payload.channel,
          sent_by: currentUser.id,
          message_body: payload.body,
          response_received: false,
        }).then(() => {});
      }
    },
    [currentUser.id, currentClinic.id]
  );

  const updateClinic = useCallback(async (updates: Partial<ClinicProfile>) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("clinic_profiles")
      .update({
        name: updates.name,
        address: updates.address,
        city: updates.city,
        state: updates.state,
        zip: updates.zip,
        npi_number: updates.npi_number,
        nps_score: updates.nps_score,
        injury_types: updates.injury_types,
        insurances_accepted: updates.insurances_accepted,
        avg_recovery_days: updates.avg_recovery_days,
      })
      .eq("id", currentClinic.id);
    if (!error) {
      setCurrentClinic((prev) => ({ ...prev, ...updates }));
    }
  }, [currentClinic.id]);

  const pendingCount = outreachLogs.filter((l) => !l.response_received).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentClinic,
        organizations,
        outreachLogs,
        pendingCount,
        selectedOrg,
        isModalOpen,
        modalChannel,
        openModal,
        closeModal,
        addOutreachLog,
        updateClinic,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside <AppProvider>");
  return ctx;
}
