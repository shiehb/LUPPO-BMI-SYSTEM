"use client"

import { SidebarProvider } from "@/components/ui/sidebar"

const COOKIE_NAME = "sidebar:state"
const ONE_YEAR = 60 * 60 * 24 * 365

interface Props {
  defaultOpen: boolean
  children: React.ReactNode
}

export function SidebarProviderWrapper({ defaultOpen, children }: Props) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      onOpenChange={(open) => {
        document.cookie = `${COOKIE_NAME}=${open}; path=/; max-age=${ONE_YEAR}`
      }}
    >
      {children}
    </SidebarProvider>
  )
}
