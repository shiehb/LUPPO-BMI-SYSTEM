-- ============================================================
-- Admin Approval Flow
-- ============================================================
-- IMPORTANT: The naive pattern of querying `public.profiles`
-- inside a policy ON `public.profiles` causes infinite RLS
-- recursion (HTTP 500). All role/approval checks are routed
-- through SECURITY DEFINER helper functions that bypass RLS
-- and read the caller's own row directly.
-- ============================================================


-- ── 1. profiles table: add is_approved column ────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

-- Back-fill: system_admin and admin rows are always approved.
UPDATE public.profiles
  SET is_approved = true
  WHERE role IN ('system_admin', 'admin');


-- ── 2. SECURITY DEFINER helpers ───────────────────────────────
-- These functions run as the DB owner (postgres), bypassing RLS
-- on profiles. Policies call them instead of doing a subquery on
-- profiles directly — that subquery is what causes the recursion.

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

-- Convenience: true when the caller is allowed to access core data.
-- system_admin is never blocked by the approval gate.
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


-- ── 3. profiles: trigger — self-registered rows cannot set
--       is_approved = true ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.enforce_is_approved_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role inserts (admin createUser) bypass RLS and this
  -- trigger via the WHEN clause; all others are forced to false.
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


-- ── 4. profiles: RLS policies ─────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Every user can read their own row (needed by middleware & guards).
DROP POLICY IF EXISTS "profiles: users read own" ON public.profiles;
CREATE POLICY "profiles: users read own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Approved admins can read all profiles.
-- Uses get_my_role() / get_my_is_approved() to avoid recursion.
DROP POLICY IF EXISTS "profiles: admins read all" ON public.profiles;
CREATE POLICY "profiles: admins read all"
  ON public.profiles
  FOR SELECT
  USING (
    get_my_role() IN ('system_admin', 'admin')
    AND is_access_allowed()
  );

-- Self-registration INSERT.
-- The trigger above forces is_approved = false regardless of payload.
DROP POLICY IF EXISTS "profiles: users insert own" ON public.profiles;
CREATE POLICY "profiles: users insert own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own non-sensitive fields.
-- is_approved cannot be changed through this policy; only service_role
-- (used by approveUser / revokeUserApproval server actions) can touch it.
DROP POLICY IF EXISTS "profiles: users update own non-sensitive" ON public.profiles;
CREATE POLICY "profiles: users update own non-sensitive"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_approved = get_my_is_approved()
  );


-- ── 5. bmi_assessments: approved users only ───────────────────

ALTER TABLE public.bmi_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bmi_assessments: approved users only" ON public.bmi_assessments;
CREATE POLICY "bmi_assessments: approved users only"
  ON public.bmi_assessments
  FOR ALL
  USING (is_access_allowed())
  WITH CHECK (is_access_allowed());


-- ── 6. assessment_windows ─────────────────────────────────────

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


-- ── 7. ranks / units: public reference data ───────────────────
-- SELECT is open to everyone so the signup form can populate
-- its dropdowns without a session.

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
