"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-semibold text-gray-900">Something went wrong</h1>
        <p className="max-w-sm text-sm text-gray-500">
          An unexpected error occurred. Please try again, or contact your administrator if the
          problem persists.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-gray-400">Error ID: {error.digest}</p>
        )}
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
