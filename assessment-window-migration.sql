-- ============================================================
-- Assessment Window Migration
-- Run this in Supabase SQL Editor to add assessment window config
-- ============================================================

-- Create assessment_windows table to store admin-defined windows per month
CREATE TABLE IF NOT EXISTS assessment_windows (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  month      TEXT        UNIQUE NOT NULL,  -- Format: "YYYY-MM"
  start_date DATE        NOT NULL,
  end_date   DATE        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (start_date <= end_date),
  CONSTRAINT valid_month_format CHECK (month ~ '^\d{4}-\d{2}$')
);

-- Optional: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assessment_windows_month ON assessment_windows(month);

-- Grant permissions (if using RLS)
ALTER TABLE assessment_windows ENABLE ROW LEVEL SECURITY;

-- Policy: System admins can read/write
CREATE POLICY "system_admin_read_write" ON assessment_windows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Policy: Users can read (but not write)
CREATE POLICY "users_can_read" ON assessment_windows
  FOR SELECT
  USING (true);
