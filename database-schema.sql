-- ============================================================
-- LUPPO BMI SYSTEM — Full Database Schema
-- Run this in the Supabase SQL Editor to set up or reset the database.
-- Safe to re-run: drops existing objects before recreating them.
-- ============================================================


-- ------------------------------------------------------------
-- 0. Drop any auth.users trigger that causes "Database error
--    saving new user". The app handles profile creation
--    manually after signup, so no auto-trigger is needed.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();


-- ------------------------------------------------------------
-- 1. Drop existing tables (cascade removes dependent policies,
--    triggers, and indexes automatically)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS bmi_assessments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS ranks CASCADE;
DROP TABLE IF EXISTS units CASCADE;


-- ------------------------------------------------------------
-- 2. Tables
-- ------------------------------------------------------------

CREATE TABLE ranks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE units (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  id                      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_number            TEXT        UNIQUE NOT NULL,
  full_name               TEXT        NOT NULL,
  last_name               TEXT        NOT NULL,
  first_name              TEXT        NOT NULL,
  middle_name             TEXT,
  qualifier               TEXT,
  rank                    TEXT,
  unit_station            TEXT,
  gender                  TEXT        CHECK (gender IN ('Male', 'Female')),
  birthdate               DATE,
  email                   TEXT        UNIQUE NOT NULL,
  role                    TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('system_admin', 'admin', 'user')),
  requires_password_change BOOLEAN    NOT NULL DEFAULT false,
  archived_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bmi_assessments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  weight            DECIMAL(5,2) NOT NULL,
  height            DECIMAL(5,2) NOT NULL,
  waist             DECIMAL(5,2),
  hip               DECIMAL(5,2),
  wrist             DECIMAL(5,2),
  bmi_score         DECIMAL(5,2) NOT NULL,
  bmi_who_status    TEXT        NOT NULL,
  bmi_pnp_status    TEXT        NOT NULL,
  weight_to_lose    DECIMAL(5,2) NOT NULL,
  normal_weight_min DECIMAL(5,2) NOT NULL,
  normal_weight_max DECIMAL(5,2) NOT NULL,
  photo_right_url   TEXT,
  photo_front_url   TEXT,
  photo_left_url    TEXT,
  frame_size        TEXT,
  remarks           TEXT,
  certified_at      TIMESTAMPTZ,
  date_taken        DATE        NOT NULL,
  submitted_at      TIMESTAMPTZ,
  reviewed_by       UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------

ALTER TABLE ranks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE units           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_assessments ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 4. Helper: role-check function (SECURITY DEFINER bypasses RLS
--    so policies on profiles don't recurse into themselves)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;


-- ── ranks policies ───────────────────────────────────────────

-- Anyone (including unauthenticated signup form) can read ranks
CREATE POLICY "ranks: public select"
  ON ranks FOR SELECT
  USING (true);

-- Only system_admins can manage ranks
CREATE POLICY "ranks: system_admin insert"
  ON ranks FOR INSERT
  WITH CHECK (get_my_role() = 'system_admin');

CREATE POLICY "ranks: system_admin update"
  ON ranks FOR UPDATE
  USING (get_my_role() = 'system_admin');

CREATE POLICY "ranks: system_admin delete"
  ON ranks FOR DELETE
  USING (get_my_role() = 'system_admin');


-- ── units policies ───────────────────────────────────────────

-- Anyone (including unauthenticated signup form) can read units
CREATE POLICY "units: public select"
  ON units FOR SELECT
  USING (true);

-- Only system_admins can manage units
CREATE POLICY "units: system_admin insert"
  ON units FOR INSERT
  WITH CHECK (get_my_role() = 'system_admin');

CREATE POLICY "units: system_admin update"
  ON units FOR UPDATE
  USING (get_my_role() = 'system_admin');

CREATE POLICY "units: system_admin delete"
  ON units FOR DELETE
  USING (get_my_role() = 'system_admin');


-- ── profiles policies ────────────────────────────────────────

-- Anyone can insert their own profile row right after signup
CREATE POLICY "profiles: self insert"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users see only their own row; admins/system_admins see all
CREATE POLICY "profiles: self select"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: admin select all"
  ON profiles FOR SELECT
  USING (get_my_role() IN ('admin', 'system_admin'));

-- Users update only their own row
CREATE POLICY "profiles: self update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins and system_admins can update any profile
CREATE POLICY "profiles: admin update all"
  ON profiles FOR UPDATE
  USING (get_my_role() IN ('admin', 'system_admin'));

-- Only system_admins can delete profiles
CREATE POLICY "profiles: system_admin delete"
  ON profiles FOR DELETE
  USING (get_my_role() = 'system_admin');


-- ── bmi_assessments policies ─────────────────────────────────

-- Users insert only their own assessments
CREATE POLICY "assessments: self insert"
  ON bmi_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users see only their own assessments
CREATE POLICY "assessments: self select"
  ON bmi_assessments FOR SELECT
  USING (auth.uid() = user_id);

-- Admins and system_admins see all assessments
CREATE POLICY "assessments: admin select all"
  ON bmi_assessments FOR SELECT
  USING (get_my_role() IN ('admin', 'system_admin'));

-- Users can only update their own draft assessments
CREATE POLICY "assessments: self update draft"
  ON bmi_assessments FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id);

-- Admins and system_admins can update any assessment (approve/reject)
CREATE POLICY "assessments: admin update all"
  ON bmi_assessments FOR UPDATE
  USING (get_my_role() IN ('admin', 'system_admin'));

-- Only system_admins can delete assessments
CREATE POLICY "assessments: system_admin delete"
  ON bmi_assessments FOR DELETE
  USING (get_my_role() = 'system_admin');


-- ------------------------------------------------------------
-- 5. Indexes
-- ------------------------------------------------------------

CREATE INDEX idx_ranks_name                  ON ranks(name);
CREATE INDEX idx_units_name                  ON units(name);

CREATE INDEX idx_profiles_badge_number       ON profiles(badge_number);
CREATE INDEX idx_profiles_email              ON profiles(email);
CREATE INDEX idx_profiles_role               ON profiles(role);
CREATE INDEX idx_profiles_archived_at        ON profiles(archived_at);

CREATE INDEX idx_assessments_user_id         ON bmi_assessments(user_id);
CREATE INDEX idx_assessments_status          ON bmi_assessments(status);
CREATE INDEX idx_assessments_date_taken      ON bmi_assessments(date_taken);
CREATE INDEX idx_assessments_reviewed_by     ON bmi_assessments(reviewed_by);


-- ------------------------------------------------------------
-- 6. updated_at auto-update trigger
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_first_user_as_system_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM profiles) = 0 THEN
    NEW.role := 'system_admin';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_first_user_system_admin
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_first_user_as_system_admin();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_assessments_updated_at
  BEFORE UPDATE ON bmi_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------
-- 7. Seed data
-- ------------------------------------------------------------

INSERT INTO ranks (id, name) VALUES
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
  ('fdd9bd59-b1bc-49f9-a19c-e1b29426dcb2', 'PLTCOL');

INSERT INTO units (id, name) VALUES
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
  ('dfee3794-df72-4792-ba8e-df5966197caf', 'POMU');
