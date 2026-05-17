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
const USER_HOME  = "/user/assessment"

// ── Types ──────────────────────────────────────────────────────────────────────

type Crumb = { label: string; href: string }

// ── Breadcrumb name map ───────────────────────────────────────────────────────

const breadcrumbNameMap: Record<string, string> = {
  // ── System Admin ────────────────────────────────────────────────────────
  "/system_admin":                  "Dashboard",
  "/system_admin/assessments":      "Dashboard",
  "/system_admin/reports":          "BMI Reports",
  "/system_admin/settings":         "Settings",
  "/system_admin/users":            "User Management",
  "/system_admin/users/add":        "Add New User",
  "/system_admin/users/archive":    "Archived Accounts",
  "/system_admin/personnel":        "Personnel",
  // ── User ────────────────────────────────────────────────────────────────
  "/user/assessment":               "My Assessment",
  "/user/assessment/add":           "Add New",
  "/user/assessment/new":           "New Assessment",
  "/user/report":                   "Print",
  "/user/report/admin-export":      "Generate Report",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const label = (path: string): string => breadcrumbNameMap[path] ?? path

// ── Route resolver ─────────────────────────────────────────────────────────────

function buildCrumbs(path: string): Crumb[] {

  // ── System Admin: Dashboard (home / default landing) ────────────────────
  if (path === "/system_admin" || path === "/system_admin/assessments") {
    return [
      { label: label(ADMIN_HOME), href: ADMIN_HOME },
    ]
  }

  // ── System Admin: individual assessment detail ───────────────────────────
  if (/^\/system_admin\/assessments\/.+/.test(path)) {
    return [
      { label: label(ADMIN_HOME),    href: ADMIN_HOME },
      { label: "Assessment Details", href: path },
    ]
  }

  // ── System Admin: BMI Reports ────────────────────────────────────────────
  if (path === "/system_admin/reports") {
    return [
      { label: label(ADMIN_HOME),              href: ADMIN_HOME },
      { label: label("/system_admin/reports"), href: path },
    ]
  }

  // ── System Admin: Settings ───────────────────────────────────────────────
  if (path === "/system_admin/settings") {
    return [
      { label: label(ADMIN_HOME),               href: ADMIN_HOME },
      { label: label("/system_admin/settings"), href: path },
    ]
  }

  // ── System Admin: User Management ───────────────────────────────────────
  if (path === "/system_admin/users") {
    return [
      { label: label(ADMIN_HOME),            href: ADMIN_HOME },
      { label: label("/system_admin/users"), href: path },
    ]
  }

  if (path === "/system_admin/users/add") {
    return [
      { label: label(ADMIN_HOME),                href: ADMIN_HOME },
      { label: label("/system_admin/users"),     href: "/system_admin/users" },
      { label: label("/system_admin/users/add"), href: path },
    ]
  }

  if (path === "/system_admin/users/archive") {
    return [
      { label: label(ADMIN_HOME),                    href: ADMIN_HOME },
      { label: label("/system_admin/users"),         href: "/system_admin/users" },
      { label: label("/system_admin/users/archive"), href: path },
    ]
  }

  if (/^\/system_admin\/users\/edit\/.+/.test(path)) {
    return [
      { label: label(ADMIN_HOME),            href: ADMIN_HOME },
      { label: label("/system_admin/users"), href: "/system_admin/users" },
      { label: "Edit User",                  href: path },
    ]
  }

  if (/^\/system_admin\/users\/view\/.+/.test(path)) {
    return [
      { label: label(ADMIN_HOME),            href: ADMIN_HOME },
      { label: label("/system_admin/users"), href: "/system_admin/users" },
      { label: "User Details",               href: path },
    ]
  }

  // ── System Admin: Personnel ──────────────────────────────────────────────
  if (path.startsWith("/system_admin/personnel")) {
    return [
      { label: label(ADMIN_HOME),                href: ADMIN_HOME },
      { label: label("/system_admin/personnel"), href: "/system_admin/personnel" },
    ]
  }

  // ── User: My Assessment (home) ───────────────────────────────────────────
  if (path === "/user" || path === USER_HOME) {
    return [
      { label: label(USER_HOME), href: USER_HOME },
    ]
  }

  // ── User: Assessment sub-routes ──────────────────────────────────────────
  if (path === "/user/assessment/add") {
    return [
      { label: label(USER_HOME),              href: USER_HOME },
      { label: label("/user/assessment/add"), href: path },
    ]
  }

  if (path === "/user/assessment/new") {
    return [
      { label: label(USER_HOME),              href: USER_HOME },
      { label: label("/user/assessment/new"), href: path },
    ]
  }

  if (/^\/user\/assessment\/edit\/.+/.test(path)) {
    return [
      { label: label(USER_HOME), href: USER_HOME },
      { label: "Edit Assessment", href: path },
    ]
  }

  if (/^\/user\/assessment\/review\/.+/.test(path)) {
    return [
      { label: label(USER_HOME),    href: USER_HOME },
      { label: "Review Assessment", href: path },
    ]
  }

  if (/^\/user\/assessment\/view\/.+/.test(path)) {
    return [
      { label: label(USER_HOME),     href: USER_HOME },
      { label: "Assessment Details", href: path },
    ]
  }

  // ── User: Report / Print ─────────────────────────────────────────────────
  if (path === "/user/report") {
    return [
      { label: label(USER_HOME),      href: USER_HOME },
      { label: label("/user/report"), href: path },
    ]
  }

  // ── User: Admin Export ───────────────────────────────────────────────────
  if (path === "/user/report/admin-export") {
    return [
      { label: label(USER_HOME),                   href: USER_HOME },
      { label: label("/user/report/admin-export"), href: path },
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
