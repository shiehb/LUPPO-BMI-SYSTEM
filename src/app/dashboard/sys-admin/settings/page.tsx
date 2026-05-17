import { fetchRanks, fetchUnits } from "@/app/system_admin/settings/actions";
import { SettingsView } from "@/app/system_admin/settings/SettingsView";

export default async function SysAdminSettingsPage() {
  const [ranks, units] = await Promise.all([fetchRanks(), fetchUnits()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">System Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage rank abbreviations and unit/station names used throughout the system.
        </p>
      </div>
      <SettingsView initialRanks={ranks} initialUnits={units} />
    </div>
  );
}
