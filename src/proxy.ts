import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ["/login", "/signup", "/forgot-password", "/auth/callback"];
  if (publicRoutes.includes(pathname)) {
    // Redirect already-authenticated users away from auth pages
    if (user && (pathname === "/login" || pathname === "/signup")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_approved")
        .eq("id", user.id)
        .single();

      const role = profile?.role;

      if (!profile?.is_approved && role !== "system_admin") {
        return NextResponse.redirect(new URL("/pending", request.url));
      }

      if (role === "system_admin") return NextResponse.redirect(new URL("/dashboard/personnel", request.url));
      if (role === "admin") return NextResponse.redirect(new URL("/dashboard/personnel", request.url));
      return NextResponse.redirect(new URL("/dashboard/my-profile", request.url));
    }
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Fetch the user's role and approval status from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_approved")
    .eq("id", user.id)
    .single();

  // Gate unapproved accounts to the /pending page only.
  // system_admin is exempt — they never need approval.
  if (!profile?.is_approved && profile?.role !== "system_admin") {
    if (pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
    return supabaseResponse;
  }

  const role = profile?.role;

  // ── New /dashboard/ route protection ──────────────────────────────────────

  // /dashboard/sys-admin/* — system_admin only
  if (pathname.startsWith("/dashboard/sys-admin") && role !== "system_admin") {
    return NextResponse.redirect(new URL("/dashboard/my-profile", request.url));
  }

  // /dashboard/personnel/* and /dashboard/reports/* — admin + system_admin
  const dashboardAdminPrefixes = ["/dashboard/personnel", "/dashboard/reports"];
  if (
    dashboardAdminPrefixes.some((p) => pathname.startsWith(p)) &&
    !["system_admin", "admin"].includes(role ?? "")
  ) {
    return NextResponse.redirect(new URL("/dashboard/my-profile", request.url));
  }

  // ── Legacy /system_admin/ route protection (kept for redirect stubs) ──────

  // Both system_admin and admin can access assessments and personnel master list
  const adminAllowedPrefixes = [
    "/system_admin/assessments",
    "/system_admin/personnel",
  ];
  if (
    adminAllowedPrefixes.some((p) => pathname.startsWith(p)) &&
    ["system_admin", "admin"].includes(role ?? "")
  ) {
    return supabaseResponse;
  }
  if (pathname.startsWith("/system_admin") && role !== "system_admin") {
    return NextResponse.redirect(new URL("/dashboard/my-profile", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
