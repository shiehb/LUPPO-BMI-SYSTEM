export type Role = "system_admin" | "admin" | "user";

export interface Profile {
  id: string;
  badge_number: string;
  full_name: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  qualifier: string | null;
  rank: string | null;
  unit_station: string | null;
  gender: "Male" | "Female" | null;
  birthdate: string | null;
  email: string;
  role: Role;
  is_approved: boolean;
  requires_password_change?: boolean;
  archived_at?: string | null;
  created_at: string;
}

export type AssessmentStatus = "draft" | "pending_approval" | "approved" | "returned" | "revision_required";

export interface Assessment {
  id: string;
  user_id: string;
  status: AssessmentStatus;
  weight: number;
  height: number;
  waist: number | null;
  hip: number | null;
  wrist: number | null;
  bmi_score: number;
  bmi_who_status: string;
  bmi_pnp_status: string;
  weight_to_lose: number;
  normal_weight_min: number;
  normal_weight_max: number;
  photo_right_url: string | null;
  photo_front_url: string | null;
  photo_left_url: string | null;
  profile_image: string | null;
  frame_size: string | null;
  remarks: string | null;
  certified_at: string | null;
  date_taken: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  admin_remarks: string | null;
  edit_requested: boolean;
  edit_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficerSummary {
  id: string;
  full_name: string;
  badge_number: string;
  rank: string | null;
  unit_station: string | null;
  gender: "Male" | "Female" | null;
  birthdate: string | null;
}

export interface AssessmentWithOfficer extends Assessment {
  officer: OfficerSummary | null;
}

// Personnel Master List types
export type PersonnelStatus = "approved" | "pending_approval" | "returned" | "revision_required" | "not_started";

export interface PersonnelRecord {
  profile: Profile;
  assessment: Assessment | null;
  status: PersonnelStatus;
}

export interface BMIReport {
  id: string;
  user_id: string;
  weight: number;
  height: number;
  bmi_score: number;
  status: string;
  pnp_status: string | null;
  waist: number | null;
  wrist: number | null;
  hip: number | null;
  weight_to_lose: number | null;
  normal_weight_min: number | null;
  normal_weight_max: number | null;
  encoder_id: string;
  created_at: string;
}
