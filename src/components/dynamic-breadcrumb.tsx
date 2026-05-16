"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const LABELS: Record<string, string> = {
  system_admin: "Dashboard",
  users:        "User Management",
  settings:     "Settings",
  assessments:  "Assessments",
  personnel:    "Personnel",
  user:         "Dashboard",
  assessment:   "Assessment",
  new:          "New",
  archive:      "Archived Accounts",
}

const CONTEXT_LABELS: Record<string, Record<string, string>> = {
  users:      { add: "Add New User",      edit: "Edit User" },
  assessment: { add: "Add New",           edit: "Edit Assessment", review: "Review Assessment" },
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function label(segment: string, parent?: string): string {
  if (parent && CONTEXT_LABELS[parent]?.[segment]) {
    return CONTEXT_LABELS[parent][segment]
  }
  return LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const crumbs = segments
    .map((seg, i) => ({
      label: label(seg, i > 0 ? segments[i - 1] : undefined),
      href: "/" + segments.slice(0, i + 1).join("/"),
      isUuid: UUID_RE.test(seg),
    }))
    .filter((c) => !c.isUuid)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
