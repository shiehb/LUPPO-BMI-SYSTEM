-- ============================================================
-- LUPPO BMI SYSTEM — Personnel Master List Migration
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Add assessment_month as a generated column (YYYY-MM) derived from date_taken.
--    EXTRACT is IMMUTABLE for DATE inputs; TO_CHAR is only STABLE (locale-dependent)
--    and is rejected by PostgreSQL for generated columns.
ALTER TABLE bmi_assessments
  ADD COLUMN IF NOT EXISTS assessment_month TEXT
  GENERATED ALWAYS AS (
    LPAD(EXTRACT(YEAR  FROM date_taken)::int::text, 4, '0') || '-' ||
    LPAD(EXTRACT(MONTH FROM date_taken)::int::text, 2, '0')
  ) STORED;

-- 2. Index for fast month-based queries
CREATE INDEX IF NOT EXISTS idx_assessments_assessment_month
  ON bmi_assessments(assessment_month);

-- 3. Update user update policy to also allow editing rejected assessments
--    (previously only allowed editing drafts)
DROP POLICY IF EXISTS "assessments: self update draft" ON bmi_assessments;

CREATE POLICY "assessments: self update draft or rejected"
  ON bmi_assessments FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('draft', 'rejected'))
  WITH CHECK (auth.uid() = user_id);
