// ─── Security helpers ─────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function layout(content: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LUPPO BMI System</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:24px 32px;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.5px;">
              🛡️ LUPPO BMI System
            </p>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:12px;">
              La Union Police Provincial Office
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;">
              This is an automated message from the LUPPO BMI Health Tracking System.<br/>
              Please do not reply directly to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

function btn(href: string, label: string, color = "#1e3a5f"): string {
  return `<a href="${href}" target="_blank"
    style="display:inline-block;margin-top:20px;padding:12px 28px;background:${color};
           color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
    ${label}
  </a>`;
}

// ─── Template: BMI Assessment Reminder ────────────────────────────────────────

export interface ReminderData {
  officerName: string;
  badgeNumber: string;
  rank: string | null;
  month: string; // "YYYY-MM"
  appUrl: string;
}

export function bmiReminderEmail(d: ReminderData): { subject: string; html: string } {
  const displayName = escapeHtml(`${d.rank ? d.rank + " " : ""}${d.officerName}`);
  const badgeNumber = escapeHtml(d.badgeNumber);
  const monthLabel  = formatMonth(d.month);

  const html = layout(/* html */ `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">BMI Assessment Reminder</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">
      ${monthLabel} submission period
    </p>

    <p style="font-size:15px;color:#374151;line-height:1.6;">
      Dear <strong>${displayName}</strong>
      <span style="color:#6b7280;font-size:13px;"> (Badge #${badgeNumber})</span>,
    </p>

    <p style="font-size:15px;color:#374151;line-height:1.6;">
      Our records show that you have <strong>not yet submitted</strong> your BMI
      self-assessment for <strong>${monthLabel}</strong>.
    </p>

    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin:20px 0;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        ⚠️ Compliance with the PNP Physical Fitness and Health Standards is mandatory.
        Please complete your assessment as soon as possible.
      </p>
    </div>

    <p style="font-size:14px;color:#374151;">
      Log in to the LUPPO BMI System to enter your measurements:
    </p>

    ${btn(d.appUrl + "/dashboard/my-profile/new", "Submit My Assessment")}

    <p style="margin-top:24px;font-size:13px;color:#9ca3af;">
      If you have already submitted your assessment, please disregard this message.
    </p>
  `);

  return {
    subject: `[LUPPO BMI] Assessment Reminder — ${monthLabel}`,
    html,
  };
}

// ─── Template: Assessment Approved ────────────────────────────────────────────

export interface ApprovedData {
  officerName: string;
  badgeNumber: string;
  rank: string | null;
  month: string;
  bmiScore: number;
  pnpStatus: string;
  appUrl: string;
}

export function assessmentApprovedEmail(d: ApprovedData): { subject: string; html: string } {
  const displayName = escapeHtml(`${d.rank ? d.rank + " " : ""}${d.officerName}`);
  const badgeNumber = escapeHtml(d.badgeNumber);
  const pnpStatus   = escapeHtml(d.pnpStatus);
  const monthLabel  = formatMonth(d.month);

  const html = layout(/* html */ `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Assessment Approved ✅</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">${monthLabel}</p>

    <p style="font-size:15px;color:#374151;line-height:1.6;">
      Dear <strong>${displayName}</strong>
      <span style="color:#6b7280;font-size:13px;"> (Badge #${badgeNumber})</span>,
    </p>

    <p style="font-size:15px;color:#374151;line-height:1.6;">
      Your BMI self-assessment for <strong>${monthLabel}</strong> has been
      <span style="color:#16a34a;font-weight:700;">approved</span>.
    </p>

    <!-- Result card -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:20px 0;">
      <tr>
        <td style="padding:18px 22px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#15803d;font-weight:600;padding-bottom:10px;"
                  colspan="2">YOUR RESULTS</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#374151;padding:4px 0;">BMI Score</td>
              <td style="font-size:15px;font-weight:700;color:#111827;text-align:right;">
                ${d.bmiScore.toFixed(2)}
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#374151;padding:4px 0;">PNP Classification</td>
              <td style="font-size:13px;font-weight:600;color:#15803d;text-align:right;">
                ${pnpStatus}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${btn(d.appUrl + "/dashboard/my-profile", "View My Assessment", "#16a34a")}
  `);

  return {
    subject: `[LUPPO BMI] Assessment Approved — ${monthLabel}`,
    html,
  };
}

// ─── Template: Assessment Returned ────────────────────────────────────────────

export interface ReturnedData {
  officerName: string;
  badgeNumber: string;
  rank: string | null;
  month: string;
  returnReason: string;
  appUrl: string;
}

export function assessmentReturnedEmail(d: ReturnedData): { subject: string; html: string } {
  const displayName  = escapeHtml(`${d.rank ? d.rank + " " : ""}${d.officerName}`);
  const badgeNumber  = escapeHtml(d.badgeNumber);
  const returnReason = escapeHtml(d.returnReason);
  const monthLabel   = formatMonth(d.month);

  const html = layout(/* html */ `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Assessment Requires Revision</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">${monthLabel}</p>

    <p style="font-size:15px;color:#374151;line-height:1.6;">
      Dear <strong>${displayName}</strong>
      <span style="color:#6b7280;font-size:13px;"> (Badge #${badgeNumber})</span>,
    </p>

    <p style="font-size:15px;color:#374151;line-height:1.6;">
      Your BMI self-assessment for <strong>${monthLabel}</strong> has been
      <span style="color:#dc2626;font-weight:700;">returned for revision</span>.
    </p>

    <!-- Reason card -->
    <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:14px 18px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#b91c1c;
                text-transform:uppercase;letter-spacing:.5px;">Reason for return</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">
        ${returnReason}
      </p>
    </div>

    <p style="font-size:14px;color:#374151;line-height:1.6;">
      Please log in, review the reason above, update your measurements, and resubmit.
    </p>

    ${btn(d.appUrl + "/dashboard/my-profile", "Revise & Resubmit", "#dc2626")}

    <p style="margin-top:20px;font-size:13px;color:#9ca3af;">
      If you believe this was returned in error, please contact your unit administrator.
    </p>
  `);

  return {
    subject: `[LUPPO BMI] Assessment Returned — ${monthLabel}`,
    html,
  };
}
