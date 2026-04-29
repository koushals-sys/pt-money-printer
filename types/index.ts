export type OrgType = "ortho" | "primary_care" | "hospital" | "sports" | "school";

export type ReferralStatus =
  | "not_contacted"
  | "contacted"
  | "follow_up"
  | "established";

export type OutreachChannel = "email" | "sms" | "phone" | "fax";

export type UserRole = "pt" | "admin" | "front_desk" | "owner";

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  fax: string;
  email: string;
  npi_number: string;
  distance_miles?: number;
  is_on_spry: boolean;
  referral_status: ReferralStatus;
  last_contacted_at?: Date;
}

export interface OutreachLog {
  id: string;
  org_id: string;
  channel: OutreachChannel;
  sent_at: Date;
  sent_by: string;
  message_body: string;
  response_received: boolean;
}

export interface ClinicProfile {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  npi_number: string;
  nps_score: number;
  injury_types: string[];
  insurances_accepted: string[];
  avg_recovery_days: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinic_id: string;
}
