"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface NavItem {
  title: string
  url: string
  icon: React.ReactNode
  exactMatch?: boolean // when true, only marks active on exact URL (not sub-paths)
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton
              asChild
              isActive={
                item.exactMatch
                  ? pathname === item.url
                  : pathname === item.url || pathname.startsWith(item.url + "/")
              }
              tooltip={item.title}
            >
              <Link href={item.url}>
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}

      </SidebarMenu>
    </SidebarGroup>
  )
}
