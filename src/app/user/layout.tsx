import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProviderWrapper } from "@/components/sidebar-provider-wrapper";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";
import type { Role } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, badge_number, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role ?? "user") as Role;

  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get("sidebar:state")?.value !== "false";

  return (
    <SidebarProviderWrapper defaultOpen={sidebarOpen}>
      <AppSidebar
        role={role}
        user={{
          name: profile?.full_name ?? "",
          badgeNumber: profile?.badge_number ?? "",
          role,
        }}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <DynamicBreadcrumb />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </SidebarInset>
    </SidebarProviderWrapper>
  );
}
