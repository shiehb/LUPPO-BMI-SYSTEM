"use client";

import { LogOut, ShieldCheck, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface AppHeaderProps {
  fullName: string;
  badgeNumber?: string;
  role: string;
  pageTitle: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_DISPLAY: Record<string, string> = {
  system_admin: "System Admin",
  admin: "Admin",
  user: "Officer",
};

export default function AppHeader({ fullName, badgeNumber, role, pageTitle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center justify-between px-4 py-3 md:px-8">

        {/* Left — branding + page title */}
        <div className="flex items-center gap-3 pl-10 md:pl-0">
          <div className="hidden sm:flex items-center gap-2 text-[#1a3a8a]">
            <ShieldCheck size={17} className="shrink-0" />
            <span className="text-xs font-semibold tracking-widest uppercase hidden xl:block">
              La Union Police Provincial Office
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-gray-200" />

          <span className="text-sm font-semibold text-gray-700">
            {pageTitle}
          </span>
        </div>

        {/* Right — avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full px-2 py-1 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1a3a8a]"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#1a3a8a] text-white text-xs font-bold">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>

              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs font-semibold text-gray-800">{fullName}</span>
                {badgeNumber && (
                  <span className="text-xs text-gray-500">Badge #{badgeNumber}</span>
                )}
              </div>

              <ChevronDown size={14} className="hidden sm:block text-gray-400" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold truncate">{fullName}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {ROLE_DISPLAY[role] ?? role}{badgeNumber ? ` · #${badgeNumber}` : ""}
              </p>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              onSelect={(e) => e.preventDefault()}
            >
              <form action="/api/auth/signout" method="POST" className="w-full">
                <button type="submit" className="flex items-center gap-2 w-full text-sm">
                  <LogOut size={14} />
                  Sign Out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
