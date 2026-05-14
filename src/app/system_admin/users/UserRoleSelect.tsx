"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

interface Props {
  userId: string;
  currentRole: Role;
}

export default function UserRoleSelect({ userId, currentRole }: Props) {
  const [role, setRole] = useState<Role>(currentRole);
  const [saving, setSaving] = useState(false);

  async function handleChange(newRole: Role) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    setRole(newRole);
    setSaving(false);
  }

  return (
    <select
      value={role}
      disabled={saving}
      aria-label="Assign role"
      onChange={(e) => handleChange(e.target.value as Role)}
      className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
    >
      <option value="user">User</option>
      <option value="admin">Admin</option>
      <option value="system_admin">System Admin</option>
    </select>
  );
}
