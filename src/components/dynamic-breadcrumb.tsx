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

// ── Constants ──────────────────────────────────────────────────────────────────

const ADMIN_HOME = "/system_admin/assessments"
const USER_HOME  = "/user"

// ── Types ──────────────────────────────────────────────────────────────────────

type Crumb = { label: string; href: string }

// ── Route resolver ─────────────────────────────────────────────────────────────
//
// Returns the exact breadcrumb trail for a given pathname.
// Explicit mapping is used instead of segment-splitting so that special cases
// like collapsing /system_admin/assessments into "Dashboard" (single crumb)
// and distinguishing "My Assessment" vs "Assessment Details" are unambiguous.

function buildCrumbs(path: string): Crumb[] {

  // ── System Admin: BMI Results (home / default landing) ──────────────────
  if (path === "/system_admin" || path === "/system_admin/assessments") {
    return [
      { label: "Dashboard", href: ADMIN_HOME },
    ]
  }

  // ── System Admin: individual assessment detail ───────────────────────────
  if (/^\/system_admin\/assessments\/.+/.test(path)) {
    return [
      { label: "Dashboard",          href: ADMIN_HOME },
      { label: "Assessment Details", href: path },
    ]
  }

  // ── System Admin: User Management root ──────────────────────────────────
  if (path === "/system_admin/users") {
    return [
      { label: "Dashboard",       href: ADMIN_HOME },
      { label: "User Management", href: "/system_admin/users" },
    ]
  }

  // ── System Admin: User Management sub-routes ────────────────────────────
  if (path === "/system_admin/users/add") {
    return [
      { label: "Dashboard",       href: ADMIN_HOME },
      { label: "User Management", href: "/system_admin/users" },
      { label: "Add New User",    href: path },
    ]
  }

  if (path === "/system_admin/users/archive") {
    return [
      { label: "Dashboard",         href: ADMIN_HOME },
      { label: "User Management",   href: "/system_admin/users" },
      { label: "Archived Accounts", href: path },
    ]
  }

  if (/^\/system_admin\/users\/edit\/.+/.test(path)) {
    return [
      { label: "Dashboard",       href: ADMIN_HOME },
      { label: "User Management", href: "/system_admin/users" },
      { label: "Edit User",       href: path },
    ]
  }

  if (/^\/system_admin\/users\/view\/.+/.test(path)) {
    return [
      { label: "Dashboard",       href: ADMIN_HOME },
      { label: "User Management", href: "/system_admin/users" },
      { label: "User Details",    href: path },
    ]
  }

  // ── System Admin: Settings ───────────────────────────────────────────────
  if (path === "/system_admin/settings") {
    return [
      { label: "Dashboard", href: ADMIN_HOME },
      { label: "Settings",  href: path },
    ]
  }
  // ── System Admin: Reports ──────────────────────────────────────────────────────────────
  if (path === "/system_admin/reports") {
    return [
      { label: "Dashboard", href: ADMIN_HOME },
      { label: "Reports",   href: path },
    ]
  }
  // ── System Admin: Personnel ──────────────────────────────────────────────
  if (path.startsWith("/system_admin/personnel")) {
    return [
      { label: "Dashboard",  href: ADMIN_HOME },
      { label: "Personnel",  href: "/system_admin/personnel" },
    ]
  }

  // ── User: home dashboard ─────────────────────────────────────────────────
  if (path === USER_HOME) {
    return [
      { label: "Dashboard", href: USER_HOME },
    ]
  }

  // ── User: My Assessment root ─────────────────────────────────────────────
  if (path === "/user/assessment") {
    return [
      { label: "Dashboard",     href: USER_HOME },
      { label: "My Assessment", href: "/user/assessment" },
    ]
  }
  // ── User: Reports ──────────────────────────────────────────────────────────────────────
  if (path === "/user/reports") {
    return [
      { label: "Dashboard", href: USER_HOME },
      { label: "Reports",   href: path },
    ]
  }
  // ── User: Assessment sub-routes ──────────────────────────────────────────
  if (path === "/user/assessment/add") {
    return [
      { label: "Dashboard",     href: USER_HOME },
      { label: "My Assessment", href: "/user/assessment" },
      { label: "Add New",       href: path },
    ]
  }

  if (/^\/user\/assessment\/edit\/.+/.test(path)) {
    return [
      { label: "Dashboard",       href: USER_HOME },
      { label: "My Assessment",   href: "/user/assessment" },
      { label: "Edit Assessment", href: path },
    ]
  }

  if (/^\/user\/assessment\/review\/.+/.test(path)) {
    return [
      { label: "Dashboard",         href: USER_HOME },
      { label: "My Assessment",     href: "/user/assessment" },
      { label: "Review Assessment", href: path },
    ]
  }

  if (/^\/user\/assessment\/view\/.+/.test(path)) {
    return [
      { label: "Dashboard",          href: USER_HOME },
      { label: "My Assessment",      href: "/user/assessment" },
      { label: "Assessment Details", href: path },
    ]
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  return [{ label: "Dashboard", href: "/" }]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  const crumbs = buildCrumbs(pathname.replace(/\/$/, ""))

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <React.Fragment key={`${crumb.href}-${i}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-semibold text-gray-800">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground transition-colors">
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>

              {!isLast && (
                <BreadcrumbSeparator className="text-gray-400">
                  {">"}
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
