"use client"

import * as React from "react"
import Image from "next/image"
import {
  Users,
  ClipboardList,
  ClipboardCheck,
  FileText,
  FileSpreadsheet,
  Settings2,
} from "lucide-react"

import { NavMain, type NavItem } from "@/components/nav-main"
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
  SidebarSeparator,
} from "@/components/ui/sidebar"
import type { Role } from "@/lib/types"

// ── Personal items — visible to every role ────────────────────────────────────

const MY_PROFILE_ITEM: NavItem = { title: "My Profile", url: "/dashboard/my-profile", icon: <ClipboardCheck className="size-4" />, exactMatch: true }
const PRINT_ITEM:      NavItem = { title: "Print",       url: "/dashboard/my-profile/report", icon: <FileText className="size-4" /> }

const PERSONAL_ITEMS: NavItem[] = [MY_PROFILE_ITEM, PRINT_ITEM]

// ── Administration items — role-gated below ───────────────────────────────────

const PERSONNEL_ITEM:  NavItem = { title: "Personnel",         url: "/dashboard/personnel",          icon: <ClipboardList   className="size-4" /> }
const REPORTS_ITEM:    NavItem = { title: "Reports",           url: "/dashboard/reports/export",     icon: <FileSpreadsheet className="size-4" /> }
const USERS_ITEM:      NavItem = { title: "User Management",   url: "/dashboard/sys-admin/users",    icon: <Users           className="size-4" /> }
const SETTINGS_ITEM:   NavItem = { title: "Platform Settings", url: "/dashboard/sys-admin/settings", icon: <Settings2       className="size-4" /> }

const ADMIN_ITEMS: Record<Role, NavItem[]> = {
  system_admin: [PERSONNEL_ITEM, REPORTS_ITEM, USERS_ITEM, SETTINGS_ITEM],
  admin:        [PERSONNEL_ITEM],
  user:         [],
}

// ── Role subtitle ─────────────────────────────────────────────────────────────

const ROLE_SUBTITLE: Record<Role, string> = {
  system_admin: "System Admin Officer",
  admin:        "Admin Officer",
  user:         "Officer",
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role: Role
  user: {
    name: string
    badgeNumber: string
    role: Role
  }
}

export function AppSidebar({ role, user, ...props }: AppSidebarProps) {
  const adminItems = ADMIN_ITEMS[role]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none select-none group-data-[collapsible=icon]:justify-center">
              {/* PNP logo — left, hidden when collapsed to icon */}
              <div className="flex size-8 sm:size-9 items-center justify-center rounded-md shrink-0 overflow-hidden group-data-[collapsible=icon]:hidden">
                <Image src="/pnp-logo.webp" alt="PNP Logo" width={36} height={36} className="w-full h-full object-contain" />
              </div>

              {/* Title — center, hidden when collapsed to icon */}
              <div className="grid flex-1 text-center text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">BMI SYSTEM</span>
                <span className="truncate text-xs opacity-60">{ROLE_SUBTITLE[role]}</span>
              </div>

              {/* PRO1 logo — right when expanded, sole icon when collapsed */}
              <div className="flex size-7 sm:size-8 items-center justify-center rounded-md shrink-0 overflow-hidden">
                <Image src="/pro1-logo.webp" alt="PRO1 Logo" width={36} height={36} className="w-full h-full object-contain" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Personal section — always visible */}
        <NavMain items={PERSONAL_ITEMS} label="Personal" />

        {/* Administration section — system_admin and admin only */}
        {adminItems.length > 0 && (
          <>
            <SidebarSeparator />
            <NavMain items={adminItems} label="Administration" />
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
