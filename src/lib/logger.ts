type Level  = "debug" | "info" | "warn" | "error";
type Domain = "auth" | "audit" | "action" | "email" | "system";

export type AuditEvent =
  | "login.failed"
  | "login.success"
  | "password_reset.requested"
  | "password_reset.completed"
  | "user.created"
  | "user.updated"
  | "user.archived"
  | "user.restored"
  | "assessment.submitted"
  | "assessment.approved"
  | "assessment.returned"
  | "assessment_window.changed"
  | "rank.created"
  | "rank.deleted"
  | "unit.created"
  | "unit.deleted";

function emit(
  level:   Level,
  domain:  Domain,
  message: string,
  meta?:   Record<string, unknown>
): void {
  const entry = JSON.stringify({
    level,
    domain,
    message,
    ts: new Date().toISOString(),
    ...meta,
  });
  if (level === "error")      console.error(entry);
  else if (level === "warn")  console.warn(entry);
  else                        console.log(entry);
}

export const logger = {
  debug: (domain: Domain, msg: string, meta?: Record<string, unknown>) =>
    emit("debug", domain, msg, meta),
  info:  (domain: Domain, msg: string, meta?: Record<string, unknown>) =>
    emit("info",  domain, msg, meta),
  warn:  (domain: Domain, msg: string, meta?: Record<string, unknown>) =>
    emit("warn",  domain, msg, meta),
  error: (domain: Domain, msg: string, meta?: Record<string, unknown>) =>
    emit("error", domain, msg, meta),
};

export function audit(
  event:   AuditEvent,
  actorId: string,
  meta:    Record<string, unknown> = {}
): void {
  emit("info", "audit", event, { event, actorId, ...meta });
}
