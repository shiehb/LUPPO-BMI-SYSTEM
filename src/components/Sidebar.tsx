"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, LogOut, ChevronLeft,
  ChevronRight, LayoutGrid, Menu, ShieldCheck, ClipboardCheck,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Role = "system_admin" | "admin" | "user";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const MY_ASSESSMENT: NavItem = { label: "My Assessment", href: "/user/assessment", icon: <ClipboardCheck size={18} /> };

const NAV_ITEMS: Record<Role, NavItem[]> = {
  system_admin: [
    { label: "Overview",        href: "/system_admin",       icon: <LayoutGrid size={18} /> },
    { label: "User Management", href: "/system_admin/users", icon: <Users size={18} /> },
    MY_ASSESSMENT,
  ],
  admin: [
    MY_ASSESSMENT,
  ],
  user: [
    { label: "My Dashboard", href: "/user", icon: <LayoutDashboard size={18} /> },
    MY_ASSESSMENT,
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  system_admin: "System Admin",
  admin:        "Personnel",
  user:         "Personnel",
};

export interface SidebarProps {
  role: Role;
  fullName: string;
  badgeNumber?: string;
}

interface NavContentProps extends SidebarProps {
  collapsed?: boolean;
}

function NavContent({ role, fullName, badgeNumber, collapsed = false }: NavContentProps) {
  const pathname = usePathname();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const items = NAV_ITEMS[role];

  return (
    <div className="flex flex-col h-full bg-[#1a3a8a] text-white">
      {/* Brand */}
      <div
        className={cn(
          "flex items-center border-b border-white/10 px-3 py-5 min-h-[68px]",
          collapsed ? "justify-center" : "gap-2"
        )}
      >
        <ShieldCheck size={collapsed ? 22 : 20} className="shrink-0 text-blue-300" />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm leading-tight whitespace-nowrap">LUPPO BMI</p>
            <p className="text-xs text-blue-300 mt-0.5 whitespace-nowrap">{ROLE_LABEL[role]} Panel</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {items.map(({ label, href, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-[#1a3a8a]"
                  : "text-blue-100 hover:bg-white/10 hover:text-white",
                collapsed && "justify-center"
              )}
            >
              {icon}
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-white/10" />

      {/* Footer */}
      <div className="px-2 py-3 space-y-1">
        {!collapsed && (
          <div className="px-3 py-1">
            <p className="text-xs font-medium text-white truncate">{fullName}</p>
            {badgeNumber && (
              <p className="text-xs text-blue-300">Badge #{badgeNumber}</p>
            )}
          </div>
        )}

        {confirmSignOut && !collapsed ? (
          <div className="mx-1 rounded-lg bg-white/10 px-3 py-2">
            <p className="text-xs text-blue-100 mb-2">Sign out?</p>
            <div className="flex gap-2">
              <form action="/api/auth/signout" method="POST" className="flex-1">
                <button
                  type="submit"
                  className="w-full rounded-md bg-red-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Yes
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirmSignOut(false)}
                className="flex-1 rounded-md bg-white/10 px-2 py-1.5 text-xs font-semibold text-blue-100 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (collapsed) {
                if (window.confirm("Sign out?")) {
                  (document.getElementById("signout-form") as HTMLFormElement)?.submit();
                }
              } else {
                setConfirmSignOut(true);
              }
            }}
            title={collapsed ? "Sign Out" : undefined}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium",
              "text-blue-100 hover:bg-red-600/80 hover:text-white transition-colors",
              collapsed && "justify-center"
            )}
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}

        <form id="signout-form" action="/api/auth/signout" method="POST" className="hidden" />
      </div>
    </div>
  );
}

export default function Sidebar({ role, fullName, badgeNumber }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile: Sheet drawer triggered by a hamburger button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-3 left-3 z-50 md:hidden h-9 w-9 shadow-md bg-white text-[#1a3a8a] border-gray-200"
          >
            <Menu size={18} />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-64 border-0 [&>button]:text-white [&>button]:top-3 [&>button]:right-3"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <NavContent role={role} fullName={fullName} badgeNumber={badgeNumber} />
        </SheetContent>
      </Sheet>

      {/* Desktop: collapsible fixed aside */}
      <aside
        className={cn(
          "hidden md:flex flex-col shrink-0 relative transition-[width] duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex-1 overflow-hidden">
          <NavContent
            role={role}
            fullName={fullName}
            badgeNumber={badgeNumber}
            collapsed={collapsed}
          />
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "absolute -right-3 top-[22px] z-20 flex h-6 w-6 items-center justify-center",
            "rounded-full bg-white shadow-md border border-gray-200",
            "text-[#1a3a8a] hover:bg-blue-50 transition-colors"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}
