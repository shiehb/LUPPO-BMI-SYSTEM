"use client"

import * as React from "react"
import {
  ShieldCheck,
  Users, ClipboardList,
  ClipboardCheck,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { Role } from "@/lib/types"

const MY_ASSESSMENT_ITEM = { title: "My Assessment", url: "/user/assessment",          icon: <ClipboardCheck className="size-4" /> }
const BMI_RESULTS_ITEM   = { title: "BMI Results",   url: "/system_admin/assessments", icon: <ClipboardList  className="size-4" /> }

const NAV_ITEMS: Record<Role, { title: string; url: string; icon: React.ReactNode }[]> = {
  system_admin: [
    BMI_RESULTS_ITEM,
    { title: "User Management", url: "/system_admin/users", icon: <Users className="size-4" /> },
    MY_ASSESSMENT_ITEM,
  ],
  admin: [
    BMI_RESULTS_ITEM,
    MY_ASSESSMENT_ITEM,
  ],
  user: [
    MY_ASSESSMENT_ITEM,
  ],
}

const ROLE_SUBTITLE: Record<Role, string> = {
  system_admin: "System Admin Panel",
  admin:        "Personnel Portal",
  user:         "Personnel Portal",
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role: Role
  user: {
    name: string
    badgeNumber: string
    role: Role
  }
}

export function AppSidebar({ role, user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none select-none">
              <div className="flex size-8 items-center justify-center rounded-md bg-white/15 shrink-0">
                <ShieldCheck className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">LUPPO BMI</span>
                <span className="truncate text-xs opacity-60">{ROLE_SUBTITLE[role]}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={NAV_ITEMS[role]} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
