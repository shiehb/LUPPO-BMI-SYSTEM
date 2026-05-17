-- ============================================================
-- LUPPO BMI SYSTEM — Complete Schema
-- Run this once on a fresh Supabase project.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / ON CONFLICT DO NOTHING.
-- ============================================================


-- ── 0. Extensions ────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ── 1. Tables ─────────────────────────────────────────────────

-- ---- 1a. profiles ------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id                       UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_number             TEXT        NOT NULL,
  full_name                TEXT        NOT NULL DEFAULT '',
  first_name               TEXT        NOT NULL DEFAULT '',
  last_name                TEXT        NOT NULL DEFAULT '',
  middle_name              TEXT,
  qualifier                TEXT,
  rank                     TEXT,
  unit_station             TEXT,
  gender                   TEXT        CHECK (gender IN ('Male', 'Female')),
  birthdate                DATE,
  email                    TEXT        NOT NULL DEFAULT '',
  role                     TEXT        NOT NULL DEFAULT 'user'
                                       CHECK (role IN ('system_admin', 'admin', 'user')),
  is_approved              BOOLEAN     NOT NULL DEFAULT false,
  requires_password_change BOOLEAN     NOT NULL DEFAULT false,
  archived_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_badge_number_key'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_badge_number_key UNIQUE (badge_number);
  END IF;
END;
$$;


-- ---- 1b. ranks ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.ranks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ranks_name_key'
      AND conrelid = 'public.ranks'::regclass
  ) THEN
    ALTER TABLE public.ranks ADD CONSTRAINT ranks_name_key UNIQUE (name);
  END IF;
END;
$$;


-- ---- 1c. units ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.units (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'units_name_key'
      AND conrelid = 'public.units'::regclass
  ) THEN
    ALTER TABLE public.units ADD CONSTRAINT units_name_key UNIQUE (name);
  END IF;
END;
$$;


-- ---- 1d. assessment_windows --------------------------------

CREATE TABLE IF NOT EXISTS public.assessment_windows (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  month      TEXT        NOT NULL,   -- YYYY-MM
  start_date DATE        NOT NULL,
  end_date   DATE        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_windows_valid_date_range  CHECK (start_date <= end_date),
  CONSTRAINT assessment_windows_valid_month_format CHECK (month ~ '^\d{4}-\d{2}$')
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assessment_windows_month_key'
      AND conrelid = 'public.assessment_windows'::regclass
  ) THEN
    ALTER TABLE public.assessment_windows ADD CONSTRAINT assessment_windows_month_key UNIQUE (month);
  END IF;
END;
$$;


-- ---- 1e. bmi_assessments -----------------------------------

CREATE TABLE IF NOT EXISTS public.bmi_assessments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft','pending_approval','approved','returned','revision_required')),
  weight            NUMERIC(7,2) NOT NULL DEFAULT 0,
  height            NUMERIC(6,3) NOT NULL DEFAULT 0,
  waist             NUMERIC(7,2),
  hip               NUMERIC(7,2),
  wrist             NUMERIC(6,2),
  bmi_score         NUMERIC(6,2) NOT NULL DEFAULT 0,
  bmi_who_status    TEXT        NOT NULL DEFAULT '',
  bmi_pnp_status    TEXT        NOT NULL DEFAULT '',
  weight_to_lose    NUMERIC(7,2) NOT NULL DEFAULT 0,
  normal_weight_min NUMERIC(7,2) NOT NULL DEFAULT 0,
  normal_weight_max NUMERIC(7,2) NOT NULL DEFAULT 0,
  photo_right_url   TEXT,
  photo_front_url   TEXT,
  photo_left_url    TEXT,
  profile_image     TEXT,
  frame_size        TEXT,
  remarks           TEXT,
  certified_at      TIMESTAMPTZ,
  date_taken        DATE        NOT NULL DEFAULT CURRENT_DATE,
  submitted_at      TIMESTAMPTZ,
  reviewed_by       UUID        REFERENCES public.profiles(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  admin_remarks     TEXT,
  edit_requested    BOOLEAN     NOT NULL DEFAULT false,
  edit_requested_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Generated column: fast month-based filtering without app-side computation
  assessment_month  TEXT GENERATED ALWAYS AS (
    LPAD(EXTRACT(YEAR  FROM date_taken)::int::text, 4, '0') || '-' ||
    LPAD(EXTRACT(MONTH FROM date_taken)::int::text, 2, '0')
  ) STORED
);


-- ── 2. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_role          ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_unit_station  ON public.profiles(unit_station);
CREATE INDEX IF NOT EXISTS idx_profiles_archived_at   ON public.profiles(archived_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved   ON public.profiles(is_approved);

CREATE INDEX IF NOT EXISTS idx_bmi_user_id            ON public.bmi_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_bmi_status             ON public.bmi_assessments(status);
CREATE INDEX IF NOT EXISTS idx_bmi_date_taken         ON public.bmi_assessments(date_taken);
CREATE INDEX IF NOT EXISTS idx_bmi_user_date          ON public.bmi_assessments(user_id, date_taken DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_windows_month   ON public.assessment_windows(month);
CREATE INDEX IF NOT EXISTS idx_bmi_assessment_month       ON public.bmi_assessments(assessment_month);


-- ── 3. Back-fill: admins are always approved ──────────────────

UPDATE public.profiles
  SET is_approved = true
  WHERE role IN ('system_admin', 'admin')
    AND is_approved = false;


-- ── 4. SECURITY DEFINER helpers ───────────────────────────────
-- Run as the DB owner, bypassing RLS on profiles.
-- Policies call these instead of direct sub-selects to avoid
-- infinite recursion (HTTP 500).

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_is_approved()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_approved, false) FROM public.profiles WHERE id = auth.uid();
$$;

-- Returns true when the caller may access core data.
-- system_admin bypasses the approval gate entirely.
CREATE OR REPLACE FUNCTION public.is_access_allowed()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN role = 'system_admin' THEN true
    ELSE COALESCE(is_approved, false)
  END
  FROM public.profiles WHERE id = auth.uid();
$$;


-- ── 5. Trigger: prevent self-setting is_approved on INSERT ────
-- Service-role inserts (admin createUser) are exempt via WHEN clause.

CREATE OR REPLACE FUNCTION public.enforce_is_approved_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_approved := false;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_is_approved ON public.profiles;
CREATE TRIGGER trg_enforce_is_approved
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (current_setting('role') <> 'service_role')
  EXECUTE FUNCTION public.enforce_is_approved_on_insert();


-- ── 6. Trigger: auto-update updated_at on profiles ───────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_bmi_updated_at ON public.bmi_assessments;
CREATE TRIGGER trg_bmi_updated_at
  BEFORE UPDATE ON public.bmi_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_windows_updated_at ON public.assessment_windows;
CREATE TRIGGER trg_windows_updated_at
  BEFORE UPDATE ON public.assessment_windows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 7. RLS: profiles ──────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Every user can read their own row (required by middleware & guards).
DROP POLICY IF EXISTS "profiles: users read own" ON public.profiles;
CREATE POLICY "profiles: users read own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Approved admins can read all profiles.
DROP POLICY IF EXISTS "profiles: admins read all" ON public.profiles;
CREATE POLICY "profiles: admins read all"
  ON public.profiles
  FOR SELECT
  USING (
    get_my_role() IN ('system_admin', 'admin')
    AND is_access_allowed()
  );

-- Self-registration INSERT (trigger forces is_approved = false).
DROP POLICY IF EXISTS "profiles: users insert own" ON public.profiles;
CREATE POLICY "profiles: users insert own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users may update their own non-sensitive fields.
-- is_approved is pinned to its current value — only service_role can change it.
DROP POLICY IF EXISTS "profiles: users update own non-sensitive" ON public.profiles;
CREATE POLICY "profiles: users update own non-sensitive"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_approved = get_my_is_approved()
  );


-- ── 8. RLS: bmi_assessments ───────────────────────────────────

ALTER TABLE public.bmi_assessments ENABLE ROW LEVEL SECURITY;

-- Approved users (and system_admin) can do all operations on their own records.
DROP POLICY IF EXISTS "bmi_assessments: users own records" ON public.bmi_assessments;
CREATE POLICY "bmi_assessments: users own records"
  ON public.bmi_assessments
  FOR ALL
  USING (auth.uid() = user_id AND is_access_allowed())
  WITH CHECK (auth.uid() = user_id AND is_access_allowed());

-- Approved admins can read and update all assessments (for review workflow).
DROP POLICY IF EXISTS "bmi_assessments: admins manage all" ON public.bmi_assessments;
CREATE POLICY "bmi_assessments: admins manage all"
  ON public.bmi_assessments
  FOR ALL
  USING (get_my_role() IN ('system_admin', 'admin') AND is_access_allowed())
  WITH CHECK (get_my_role() IN ('system_admin', 'admin') AND is_access_allowed());


-- ── 9. RLS: assessment_windows ────────────────────────────────

ALTER TABLE public.assessment_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assessment_windows: approved users read" ON public.assessment_windows;
CREATE POLICY "assessment_windows: approved users read"
  ON public.assessment_windows
  FOR SELECT
  USING (is_access_allowed());

DROP POLICY IF EXISTS "assessment_windows: admins manage" ON public.assessment_windows;
CREATE POLICY "assessment_windows: admins manage"
  ON public.assessment_windows
  FOR ALL
  USING (get_my_role() IN ('system_admin', 'admin') AND is_access_allowed())
  WITH CHECK (get_my_role() IN ('system_admin', 'admin') AND is_access_allowed());


-- ── 10. RLS: ranks ────────────────────────────────────────────
-- SELECT is open to anonymous so the signup form can populate dropdowns.

ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ranks: public read" ON public.ranks;
CREATE POLICY "ranks: public read"
  ON public.ranks FOR SELECT USING (true);

DROP POLICY IF EXISTS "ranks: admins manage" ON public.ranks;
CREATE POLICY "ranks: admins manage"
  ON public.ranks
  FOR ALL
  USING (get_my_role() IN ('system_admin', 'admin') AND is_access_allowed())
  WITH CHECK (get_my_role() IN ('system_admin', 'admin') AND is_access_allowed());


-- ── 11. RLS: units ────────────────────────────────────────────

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "units: public read" ON public.units;
CREATE POLICY "units: public read"
  ON public.units FOR SELECT USING (true);

DROP POLICY IF EXISTS "units: admins manage" ON public.units;
CREATE POLICY "units: admins manage"
  ON public.units
  FOR ALL
  USING (get_my_role() IN ('system_admin', 'admin') AND is_access_allowed())
  WITH CHECK (get_my_role() IN ('system_admin', 'admin') AND is_access_allowed());


-- ── 12. Storage: assessment-photos bucket ─────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assessment-photos',
  'assessment-photos',
  true,
  5242880,           -- 5 MB per file
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (bucket is public; policy provides belt-and-suspenders).
DROP POLICY IF EXISTS "assessment-photos: public read" ON storage.objects;
CREATE POLICY "assessment-photos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assessment-photos');

-- Authenticated users upload only to their own folder: {user_id}/...
DROP POLICY IF EXISTS "assessment-photos: users upload own" ON storage.objects;
CREATE POLICY "assessment-photos: users upload own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assessment-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may update/replace their own files.
DROP POLICY IF EXISTS "assessment-photos: users update own" ON storage.objects;
CREATE POLICY "assessment-photos: users update own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'assessment-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may delete their own files.
DROP POLICY IF EXISTS "assessment-photos: users delete own" ON storage.objects;
CREATE POLICY "assessment-photos: users delete own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assessment-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ── 13. Seed data ─────────────────────────────────────────────

INSERT INTO public.ranks (id, name) VALUES
  ('0418f72d-19bd-440b-bca5-7577a02c6b2b', 'Pat'),
  ('49f46280-c486-4f7f-8539-73a4d61d300e', 'PSMS'),
  ('53cde73a-9c76-4495-bcd5-bc0c9920959a', 'PCPT'),
  ('57236be3-6e6b-4b8b-b01f-60a97ce38789', 'PSSg'),
  ('60fa6187-4e93-4d82-bcb6-510e89f7f963', 'PCMS'),
  ('8e66bfe2-2636-41e9-bfc8-5e621d057547', 'PMSg'),
  ('c22a8f09-ac7c-41f4-bf3a-e3977732c1ab', 'PLT'),
  ('c4a8c620-a1e6-48e6-a841-5383e1375311', 'PCpl'),
  ('d2977083-2fda-4dfd-aaa9-edcb40793962', 'PEMS'),
  ('e1041894-e33b-4b2f-a596-166d4bb77994', 'PMAJ'),
  ('fc52f87a-8403-4998-a17d-3a57fb56d50d', 'NUP'),
  ('fdd9bd59-b1bc-49f9-a19c-e1b29426dcb2', 'PLTCOL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.units (id, name) VALUES
  ('008aa03b-4122-4853-81bf-1bdd59c4c30b', 'PSMU'),
  ('00f3d3b5-7bd6-4b18-999b-da2df6c57a63', 'SAN GABRIEL MPS'),
  ('0667b700-5e13-46da-b58c-3b3b15671a66', 'ODPDO'),
  ('07a563a2-6193-434e-9605-ce933cb234ee', 'PPPU'),
  ('07dad0aa-0153-4622-834b-79bde36658c4', 'BANGAR MPS'),
  ('0969498d-7b17-442f-b03d-252910f5b589', 'PUGO MPS'),
  ('0b6a85df-49f9-4592-86db-d357e7f25ab4', 'POU'),
  ('12329b15-b6ae-40b9-abf4-64a8b1f813ff', 'BACNOTAN MPS'),
  ('1a10fee2-d0c9-49f3-a6c5-d2f4fcc5e919', 'SANTO TOMAS MPS'),
  ('232d8cd8-9079-4355-a28f-2e9b2f3f58e2', 'SUDIPEN MPS'),
  ('26b489e0-bc3a-42e2-aba1-bdd8263db217', 'BAUANG MPS'),
  ('2da5f9d8-f031-4163-a68f-9fbd2cae8e82', '2ND PMFC'),
  ('38ef8c54-40de-4756-bcaf-f1a048110216', 'CSFPS'),
  ('437e5432-8153-4c9f-9098-6d22f4db151a', 'PARMU'),
  ('49f7723f-f7e8-48c5-abb3-6b2a09e770a4', 'AGOO MPS'),
  ('4b509dd8-ca76-468d-88d0-6396061af4da', 'SAN JUAN MPS'),
  ('56293f58-3797-4129-8aa7-917a6a1e39a5', 'SANTOL MPS'),
  ('57b51245-eeb0-462d-b320-97b22da1e433', 'BAGULIN MPS'),
  ('57e17dc4-0843-4511-8976-1821fc003efb', 'OPD'),
  ('592ca5ca-1919-4dc6-9e21-347536fefef6', '1ST PMFC'),
  ('5e098b28-2576-4dbb-a0e1-1f5ffcbf2717', 'PIDMU'),
  ('5faf999f-fc07-410d-8c9b-982de9d1ece9', 'ODPDA'),
  ('6a933745-76ce-463f-a76b-7ffec9cceb5c', 'NAGUILIAN MPS'),
  ('71c618df-f8aa-4b05-b55e-aab63bf2b1a0', 'ARINGAY MPS'),
  ('73f13b2b-7c12-44a1-bee9-e386ca07d2b9', 'PCADU'),
  ('7e15af6b-bb12-4bea-8235-4810c0fc4c06', 'LUNA MPS'),
  ('7e44a2cb-53e5-4773-acc8-78bd98c15eb5', 'PDEU'),
  ('880ef956-2068-4bdc-9c3c-15530c693f03', 'PPO-PSMU'),
  ('995ec7ee-f443-4599-8ff5-887095d48dde', 'PIU'),
  ('a514127c-9594-4f9e-b4de-34c3b465f283', 'TUBAO MPS'),
  ('b914042b-1b57-434b-8166-fe409cbe7a18', 'GSS'),
  ('bf2b2e49-88c5-439a-b8cd-6e97b2b60015', 'HRAD'),
  ('cbd48e72-9d36-424b-a0ec-d8224267d751', 'BALAOAN MPS'),
  ('cc277e1b-3a3a-4bc6-ad9b-8da25d0f87b9', 'BURGOS MPS'),
  ('cdffe2db-8d45-44bb-8230-4ca2f2686abb', 'ROSARIO MPS'),
  ('d951f081-e561-431c-ac03-baafa759a9e8', 'CABA MPS'),
  ('dfee3794-df72-4792-ba8e-df5966197caf', 'POMU')
ON CONFLICT (id) DO NOTHING;
