-- ============================================================
-- Migration 001 – Initial schema for spry-referral
-- ============================================================

-- pgcrypto is required for gen_random_uuid() on older Postgres versions.
-- Supabase projects on Postgres 14+ have it built-in.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TABLES
-- ============================================================

-- 1. clinic_profiles ─────────────────────────────────────────
-- One row per PT clinic (the "tenant").
CREATE TABLE IF NOT EXISTS public.clinic_profiles (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL,
  address              TEXT        NOT NULL,
  city                 TEXT        NOT NULL,
  state                CHAR(2)     NOT NULL,
  zip                  VARCHAR(10) NOT NULL,
  npi_number           TEXT,
  nps_score            SMALLINT    CHECK (nps_score BETWEEN -100 AND 100),
  injury_types         TEXT[]      NOT NULL DEFAULT '{}',
  insurances_accepted  TEXT[]      NOT NULL DEFAULT '{}',
  avg_recovery_days    SMALLINT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 2. users ───────────────────────────────────────────────────
-- Mirrors auth.users with app-level role + clinic membership.
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  clinic_id  UUID        NOT NULL    REFERENCES public.clinic_profiles (id),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'pt'
                         CHECK (role IN ('pt', 'admin', 'front_desk', 'owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3. organizations ───────────────────────────────────────────
-- Referring practices tracked by a clinic.
CREATE TABLE IF NOT EXISTS public.organizations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID        NOT NULL REFERENCES public.clinic_profiles (id),
  name              TEXT        NOT NULL,
  type              TEXT        NOT NULL
                                CHECK (type IN ('ortho', 'primary_care', 'hospital', 'sports', 'school')),
  address           TEXT        NOT NULL,
  city              TEXT        NOT NULL,
  state             CHAR(2)     NOT NULL,
  zip               VARCHAR(10) NOT NULL,
  phone             TEXT        NOT NULL,
  fax               TEXT,
  email             TEXT,
  npi_number        TEXT,
  distance_miles    NUMERIC(8, 2),
  is_on_spry        BOOLEAN     NOT NULL DEFAULT false,
  referral_status   TEXT        NOT NULL DEFAULT 'not_contacted'
                                CHECK (referral_status IN ('not_contacted', 'contacted', 'follow_up', 'established')),
  last_contacted_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 4. outreach_logs ───────────────────────────────────────────
-- Every email/sms/phone/fax touch logged against an org.
CREATE TABLE IF NOT EXISTS public.outreach_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  clinic_id         UUID        NOT NULL REFERENCES public.clinic_profiles (id),
  channel           TEXT        NOT NULL
                                CHECK (channel IN ('email', 'sms', 'phone', 'fax')),
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by           UUID        NOT NULL REFERENCES auth.users (id),
  message_body      TEXT        NOT NULL,
  response_received BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 5. referral_contacts ───────────────────────────────────────
-- Named contact people within an organization.
CREATE TABLE IF NOT EXISTS public.referral_contacts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  clinic_id     UUID        NOT NULL REFERENCES public.clinic_profiles (id),
  name          TEXT        NOT NULL,
  title         TEXT,
  direct_phone  TEXT,
  direct_email  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 6. follow_up_reminders ─────────────────────────────────────
-- Scheduled follow-up tasks for an org.
CREATE TABLE IF NOT EXISTS public.follow_up_reminders (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  clinic_id   UUID        NOT NULL REFERENCES public.clinic_profiles (id),
  remind_at   TIMESTAMPTZ NOT NULL,
  note        TEXT,
  assigned_to UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  is_done     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- INDEXES
-- ============================================================

-- organizations ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_organizations_clinic_id
  ON public.organizations (clinic_id);

CREATE INDEX IF NOT EXISTS idx_organizations_state
  ON public.organizations (state);

CREATE INDEX IF NOT EXISTS idx_organizations_type
  ON public.organizations (type);

CREATE INDEX IF NOT EXISTS idx_organizations_referral_status
  ON public.organizations (referral_status);

-- outreach_logs ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_outreach_logs_clinic_id
  ON public.outreach_logs (clinic_id);

CREATE INDEX IF NOT EXISTS idx_outreach_logs_sent_at
  ON public.outreach_logs (sent_at DESC);

-- follow_up_reminders ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_clinic_id
  ON public.follow_up_reminders (clinic_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_remind_at
  ON public.follow_up_reminders (remind_at)
  WHERE is_done = false;


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clinic_profiles',
    'users',
    'organizations',
    'referral_contacts',
    'follow_up_reminders'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;


-- ============================================================
-- RLS HELPER
-- ============================================================

-- Returns the clinic_id of the currently authenticated user.
-- SECURITY DEFINER so the SELECT on public.users doesn't
-- require a separate policy while evaluating policies.
CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT clinic_id FROM public.users WHERE id = auth.uid()
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.clinic_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;


-- clinic_profiles ────────────────────────────────────────────
-- Users read only their own clinic.
CREATE POLICY "clinic_profiles: read own"
  ON public.clinic_profiles
  FOR SELECT
  USING (id = public.current_clinic_id());

-- Owners can update their clinic profile.
CREATE POLICY "clinic_profiles: owner update"
  ON public.clinic_profiles
  FOR UPDATE
  USING (
    id = public.current_clinic_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'owner'
    )
  );


-- users ──────────────────────────────────────────────────────
-- Every authenticated user can read all teammates in their clinic.
CREATE POLICY "users: read own clinic"
  ON public.users
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

-- Owners can insert/update/delete users in their clinic.
CREATE POLICY "users: owner insert"
  ON public.users
  FOR INSERT
  WITH CHECK (
    clinic_id = public.current_clinic_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "users: owner update"
  ON public.users
  FOR UPDATE
  USING (
    clinic_id = public.current_clinic_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "users: owner delete"
  ON public.users
  FOR DELETE
  USING (
    clinic_id = public.current_clinic_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'owner'
    )
  );


-- organizations ──────────────────────────────────────────────
CREATE POLICY "organizations: clinic read"
  ON public.organizations
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

CREATE POLICY "organizations: clinic insert"
  ON public.organizations
  FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY "organizations: clinic update"
  ON public.organizations
  FOR UPDATE
  USING (clinic_id = public.current_clinic_id());

CREATE POLICY "organizations: clinic delete"
  ON public.organizations
  FOR DELETE
  USING (clinic_id = public.current_clinic_id());


-- outreach_logs ──────────────────────────────────────────────
CREATE POLICY "outreach_logs: clinic read"
  ON public.outreach_logs
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

CREATE POLICY "outreach_logs: clinic insert"
  ON public.outreach_logs
  FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY "outreach_logs: clinic update"
  ON public.outreach_logs
  FOR UPDATE
  USING (clinic_id = public.current_clinic_id());

-- Outreach logs are append-only in practice; delete restricted to owners.
CREATE POLICY "outreach_logs: owner delete"
  ON public.outreach_logs
  FOR DELETE
  USING (
    clinic_id = public.current_clinic_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'owner'
    )
  );


-- referral_contacts ──────────────────────────────────────────
CREATE POLICY "referral_contacts: clinic read"
  ON public.referral_contacts
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

CREATE POLICY "referral_contacts: clinic insert"
  ON public.referral_contacts
  FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY "referral_contacts: clinic update"
  ON public.referral_contacts
  FOR UPDATE
  USING (clinic_id = public.current_clinic_id());

CREATE POLICY "referral_contacts: clinic delete"
  ON public.referral_contacts
  FOR DELETE
  USING (clinic_id = public.current_clinic_id());


-- follow_up_reminders ────────────────────────────────────────
CREATE POLICY "follow_up_reminders: clinic read"
  ON public.follow_up_reminders
  FOR SELECT
  USING (clinic_id = public.current_clinic_id());

CREATE POLICY "follow_up_reminders: clinic insert"
  ON public.follow_up_reminders
  FOR INSERT
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE POLICY "follow_up_reminders: clinic update"
  ON public.follow_up_reminders
  FOR UPDATE
  USING (clinic_id = public.current_clinic_id());

CREATE POLICY "follow_up_reminders: clinic delete"
  ON public.follow_up_reminders
  FOR DELETE
  USING (clinic_id = public.current_clinic_id());
