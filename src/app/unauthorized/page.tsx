import Link from "next/link";
import { ShieldX } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "403 – Access Denied | LUPPO BMI System",
};

/**
 * Rendered when a user attempts to access a resource that belongs to a
 * different account (e.g., guessing or swapping an assessment ID in the URL).
 * The print endpoint redirects here instead of revealing a 404, so the
 * response is unambiguously an ownership failure, not a missing resource.
 */
export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="w-full max-w-sm rounded-3xl border border-red-100 bg-white p-10 shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <ShieldX className="h-8 w-8" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
          403 – Access Denied
        </p>

        <h1 className="mt-2 text-xl font-bold text-slate-900">
          You can&apos;t view this record
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          This BMI assessment belongs to a different account. Each person may
          only view and print their own individual record.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <Link
            href="/dashboard/my-profile"
            className="inline-flex items-center justify-center rounded-lg bg-[#1a3a8a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#142f73]"
          >
            Go to My BMI Report
          </Link>
          <Link
            href="/dashboard/my-profile"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            My Assessment
          </Link>
        </div>
      </div>
    </div>
  );
}
