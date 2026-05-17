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

// ── Types ──────────────────────────────────────────────────────────────────────

// href is optional — crumbs without one render as plain section labels (no link)
type Crumb = { label: string; href?: string }

// ── ID guard ──────────────────────────────────────────────────────────────────
// Strips raw UUIDs (v4) and plain integers from visible breadcrumb text so
// database identifiers never reach the UI.

const IS_DYNAMIC_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^\d+$/i

// ── Breadcrumb builder ────────────────────────────────────────────────────────

function buildCrumbs(path: string): Crumb[] {

  // Hydration guard — pathname may be empty during the initial SSR pass
  if (!path) return [{ label: "Dashboard" }]

  // ── /dashboard/my-profile ──────────────────────────────────────────────────
  //  Display: Dashboard > My Profile
  //         + New Assessment   when path ends with /new
  //         + Edit Assessment  when path ends with /edit
  //         + Review Assessment when path ends with /review

  if (path.startsWith("/dashboard/my-profile")) {
    const dashCrumb: Crumb = { label: "Dashboard",  href: "/dashboard/my-profile" }
    const profCrumb: Crumb = { label: "My Profile", href: "/dashboard/my-profile" }

    if (path === "/dashboard/my-profile") {
      // Root: "Dashboard" is the parent link, "My Profile" is the active page
      return [dashCrumb, { label: "My Profile" }]
    }
    if (path === "/dashboard/my-profile/report") return [dashCrumb, profCrumb, { label: "My BMI Report" }]
    if (path.endsWith("/new"))    return [dashCrumb, profCrumb, { label: "New Assessment" }]
    if (path.endsWith("/edit"))   return [dashCrumb, profCrumb, { label: "Edit Assessment" }]
    if (path.endsWith("/review")) return [dashCrumb, profCrumb, { label: "Review Assessment" }]
    return [dashCrumb, { label: "My Profile" }]
  }

  // ── /dashboard/personnel ───────────────────────────────────────────────────
  //  Display: Dashboard > Personnel Management
  //         + Profile View  when a dynamic ID segment follows

  if (path.startsWith("/dashboard/personnel")) {
    const dashCrumb: Crumb  = { label: "Dashboard",            href: "/dashboard/personnel" }
    const sectCrumb: Crumb  = { label: "Personnel Management", href: "/dashboard/personnel" }

    if (path === "/dashboard/personnel") {
      return [dashCrumb, { label: "Personnel Management" }]
    }

    // Check whether the segment immediately after /personnel/ is a raw ID
    const tail         = path.slice("/dashboard/personnel/".length)
    const firstSegment = tail.split("/")[0]

    if (IS_DYNAMIC_ID.test(firstSegment)) {
      return [dashCrumb, sectCrumb, { label: "Profile View" }]
    }

    return [dashCrumb, { label: "Personnel Management" }]
  }

  // ── /dashboard/reports ─────────────────────────────────────────────────────

  if (path.startsWith("/dashboard/reports")) {
    const dashCrumb: Crumb = { label: "Dashboard", href: "/dashboard/personnel" }
    if (path === "/dashboard/reports/export") {
      return [dashCrumb, { label: "Reports", href: "/dashboard/reports/export" }, { label: "Generate Report" }]
    }
    return [dashCrumb, { label: "Reports" }]
  }

  // ── /dashboard/sys-admin ───────────────────────────────────────────────────
  //  Display: Dashboard > System Admin
  //         + Users     for /users (and sub-routes)
  //         + Settings  for /settings

  if (path.startsWith("/dashboard/sys-admin")) {
    const dashCrumb:  Crumb = { label: "Dashboard",   href: "/dashboard/personnel" }
    const adminCrumb: Crumb = { label: "System Admin" }
    const usersCrumb: Crumb = { label: "Users",        href: "/dashboard/sys-admin/users" }

    const tail = path.slice("/dashboard/sys-admin".length) // e.g. "/users", "/settings"

    if (tail.startsWith("/users")) {
      if (tail === "/users")          return [dashCrumb, adminCrumb, { label: "Users" }]
      if (tail === "/users/new")      return [dashCrumb, adminCrumb, usersCrumb, { label: "Add New User" }]
      if (tail === "/users/archived") return [dashCrumb, adminCrumb, usersCrumb, { label: "Archived Accounts" }]
      if (/^\/users\/.+\/edit$/.test(tail)) {
        return [dashCrumb, adminCrumb, usersCrumb, { label: "Edit User" }]
      }
      return [dashCrumb, adminCrumb, { label: "Users" }]
    }

    if (tail === "/settings")         return [dashCrumb, adminCrumb, { label: "Settings" }]
    if (tail.startsWith("/reports"))  return [dashCrumb, adminCrumb, { label: "BMI Reports" }]

    return [dashCrumb, adminCrumb]
  }

  // ── Fallback ──────────────────────────────────────────────────────────────

  return [{ label: "Dashboard" }]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DynamicBreadcrumb() {
  const pathname = usePathname()

  // Hydration guard — usePathname() can be null during the initial SSR pass
  if (!pathname) return null

  const crumbs = buildCrumbs(pathname.replace(/\/+$/, "").trim()).filter(
    (c) => c.label && c.label.trim() !== ""
  )

  if (crumbs.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <React.Fragment key={`${crumb.href ?? crumb.label}-${i}`}>
              <BreadcrumbItem>
                {isLast ? (
                  // Current page — never a link
                  <BreadcrumbPage className="font-semibold text-gray-800">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : crumb.href ? (
                  // Parent with a navigable target
                  <BreadcrumbLink
                    asChild
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  // Section label — no link, styled identically to other ancestors
                  <span className="text-sm text-muted-foreground">{crumb.label}</span>
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
