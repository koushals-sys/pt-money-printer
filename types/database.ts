// Auto-generate the real version of this file by running:
//   npx supabase gen types typescript --project-id <project-id> > types/database.ts

// ─── Row types (defined outside Database to avoid circular Omit issues) ───────

type ClinicProfileRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  npi_number: string | null;
  nps_score: number | null;
  injury_types: string[];
  insurances_accepted: string[];
  avg_recovery_days: number | null;
  created_at: string;
  updated_at: string;
};

type UserRow = {
  id: string;
  clinic_id: string;
  name: string;
  email: string;
  role: "pt" | "admin" | "front_desk" | "owner";
  created_at: string;
  updated_at: string;
};

type OrganizationRow = {
  id: string;
  clinic_id: string;
  name: string;
  type: "ortho" | "primary_care" | "hospital" | "sports" | "school";
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  fax: string | null;
  email: string | null;
  npi_number: string | null;
  distance_miles: number | null;
  is_on_spry: boolean;
  referral_status: "not_contacted" | "contacted" | "follow_up" | "established";
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
};

type OutreachLogRow = {
  id: string;
  org_id: string;
  clinic_id: string;
  channel: "email" | "sms" | "phone" | "fax";
  sent_at: string;
  sent_by: string;
  message_body: string;
  response_received: boolean;
  created_at: string;
};

type ReferralContactRow = {
  id: string;
  org_id: string;
  clinic_id: string;
  name: string;
  title: string | null;
  direct_phone: string | null;
  direct_email: string | null;
  created_at: string;
  updated_at: string;
};

type FollowUpReminderRow = {
  id: string;
  org_id: string;
  clinic_id: string;
  remind_at: string;
  note: string | null;
  assigned_to: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Database type ────────────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      clinic_profiles: {
        Row: ClinicProfileRow;
        Insert: {
          id?: string;
          name: string;
          address: string;
          city: string;
          state: string;
          zip: string;
          npi_number?: string | null;
          nps_score?: number | null;
          injury_types?: string[];
          insurances_accepted?: string[];
          avg_recovery_days?: number | null;
        };
        Update: Partial<Omit<ClinicProfileRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, "created_at" | "updated_at">;
        Update: Partial<Omit<UserRow, "created_at" | "updated_at">>;
        Relationships: [];
      };
      organizations: {
        Row: OrganizationRow;
        Insert: Omit<OrganizationRow, "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<OrganizationRow, "created_at" | "updated_at">>;
        Relationships: [];
      };
      outreach_logs: {
        Row: OutreachLogRow;
        Insert: {
          id?: string;
          org_id: string;
          clinic_id: string;
          channel: "email" | "sms" | "phone" | "fax";
          sent_at?: string;
          sent_by: string;
          message_body: string;
          response_received?: boolean;
        };
        Update: Partial<Omit<OutreachLogRow, "id" | "created_at">>;
        Relationships: [];
      };
      referral_contacts: {
        Row: ReferralContactRow;
        Insert: Omit<ReferralContactRow, "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<ReferralContactRow, "created_at" | "updated_at">>;
        Relationships: [];
      };
      follow_up_reminders: {
        Row: FollowUpReminderRow;
        Insert: Omit<FollowUpReminderRow, "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<FollowUpReminderRow, "created_at" | "updated_at">>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      current_clinic_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
