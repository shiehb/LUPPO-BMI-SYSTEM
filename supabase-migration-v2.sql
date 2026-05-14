-- ============================================================
-- LUPPO BMI SYSTEM — Migration v2
-- Adds frame_size and remarks columns to bmi_assessments.
-- Safe to run multiple times (IF NOT EXISTS).
-- ============================================================

ALTER TABLE bmi_assessments
  ADD COLUMN IF NOT EXISTS frame_size TEXT,
  ADD COLUMN IF NOT EXISTS remarks    TEXT;
