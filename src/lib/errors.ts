// Safe business-logic error prefixes that can be shown verbatim to the client.
// Everything else is redacted and logged server-side only.
const SAFE_PREFIXES = [
  "Missing required fields",
  "Assessment window is",
  "You have already submitted",
  "Cannot delete:",
  "Complete your draft",
  "Name is required",
  "Name must be",
  "Name contains invalid",
  "Badge number",
  "First name",
  "Last name",
  "Unit/Station",
  "Invalid email",
  "Birthdate must",
  "Start date",
  "End date",
  "Month must be",
  "Weight is out",
  "Height is out",
  "Waist is out",
  "Hip is out",
  "Wrist is out",
  "Invalid right photo",
  "Invalid front photo",
  "Invalid left photo",
  "Invalid ID format",
  "Invalid assessment ID",
  "Invalid user ID",
  "Officer email not found",
  "Assessment not found",
] as const;

export function toClientError(
  err: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message === "UNAUTHENTICATED")
    return "You must be logged in to perform this action.";
  if (message === "FORBIDDEN")
    return "You do not have permission to perform this action.";

  if (SAFE_PREFIXES.some((prefix) => message.startsWith(prefix)))
    return message;

  // Log the real error server-side; never expose raw DB/auth messages to the client
  console.error(
    JSON.stringify({
      level:   "error",
      domain:  "action",
      event:   "unhandled_error",
      message,
      stack:   err instanceof Error ? err.stack : undefined,
      ts:      new Date().toISOString(),
    })
  );

  return fallback;
}

export async function withActionGuard<T>(
  fn: () => Promise<T>,
  fallback?: string
): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    return { error: toClientError(err, fallback) };
  }
}
