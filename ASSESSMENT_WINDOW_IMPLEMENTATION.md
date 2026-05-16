# BMI System Assessment Window & Monthly Limit Implementation

## Overview

This implementation adds two key constraints to the LUPPO BMI System:

1. **Admin-Controlled Assessment Window**: System admins can define a date range (start/end dates) for the current month during which personnel can submit assessments.
2. **One Assessment Per Month Limit**: Personnel are strictly limited to exactly ONE assessment submission per calendar month.

---

## Database Setup

### Step 1: Run the Migration

Open Supabase SQL Editor and execute the contents of:
```
assessment-window-migration.sql
```

This creates the `assessment_windows` table with RLS policies:
- System admins can read/write assessment windows
- Regular users can only read (to check if window is open)

---

## Frontend Features

### 1. Admin Assessment Window Control (BMI Results Page)

**Location**: `/system_admin/assessments`

**Component**: `AssessmentWindowControl.tsx`

**Features**:
- Displays current month (e.g., "May 2026")
- Start Date input field
- End Date input field
- Status badge showing if window is "Open" or "Closed"
- "Save Window" button to persist changes
- Warning note explaining functionality

**UI Flow**:
1. Admin sees the current month's window (or defaults to first/last day of month)
2. Admin can adjust start and end dates
3. Admin clicks "Save Window"
4. Badge updates to show window status
5. Personnel see button disabled if window is closed

---

### 2. Personnel Assessment Submission (My Assessment Page)

**Location**: `/user/assessment`

**Components**:
- `NewAssessmentButton.tsx` - Handles monthly check and confirmation
- `AssessmentConfirmDialog.tsx` - Confirmation alert dialog

**Features**:
- On page load, checks if user has an existing assessment for the current month
- If assessment exists → Shows locked badge: `[🔒 May 2026 Assessment Completed]`
- If no assessment → Shows "New Assessment" button
- Clicking button triggers confirmation dialog
- Dialog shows warning about one-assessment-per-month limit
- On confirmation → User navigates to `/user/assessment/add`

**Dialog Content**:
```
Title: "Confirm Assessment Submission"
Description: "Are you sure you want to create and submit your BMI assessment? 
You are only allowed to create 1 assessment for each month. Please make sure 
your weight, height, and side-view photos are completely accurate before proceeding."

Warning Box:
- This action cannot be easily undone for the current month
- Ensure all measurements are accurate before submission
- Photos must clearly show your physique from all angles
```

---

## Backend Functions

### Location
`src/app/system_admin/assessments/assessment-window-actions.ts`

### Key Functions

#### 1. `getCurrentMonthString(): string`
Returns current month in "YYYY-MM" format
```typescript
// Example: "2026-05"
```

#### 2. `getAssessmentWindow(monthStr: string)`
Fetches the assessment window for a given month
```typescript
const window = await getAssessmentWindow("2026-05");
// Returns: { id, month, start_date, end_date, created_at, updated_at }
// or null if no window defined
```

#### 3. `checkAssessmentWindowOpen(): Promise<{ isOpen: boolean; message?: string }>`
Checks if current date is within the window
```typescript
const result = await checkAssessmentWindowOpen();
if (!result.isOpen) {
  console.log(result.message); // "Assessment window is currently closed."
}
```

#### 4. `setAssessmentWindow(monthStr, startDate, endDate): Promise<{ error?: string }>`
Admin-only function to set/update assessment window
```typescript
const result = await setAssessmentWindow(
  "2026-05",
  "2026-05-01",
  "2026-05-31"
);
if (result.error) {
  console.error(result.error);
}
```

#### 5. `checkMonthlyAssessmentExists(userId): Promise<{ hasExisting: boolean; assessment? }>`
Checks if user has an assessment in the current month
```typescript
const result = await checkMonthlyAssessmentExists(userId);
if (result.hasExisting) {
  console.log("User already has May 2026 assessment");
  console.log(result.assessment); // Assessment details
}
```

#### 6. `validateAssessmentSubmission(userId): Promise<{ valid: boolean; message?: string }>`
Guards both window and monthly limit (called before saving)
```typescript
const validation = await validateAssessmentSubmission(userId);
if (!validation.valid) {
  return { error: validation.message }; // Send 403 error
}
```

---

## Backend Validation Flow

### In `saveDraft()` (Updated)

When `intent === "submit"`:

1. **Check Assessment Window**
   ```typescript
   const windowCheck = await checkAssessmentWindowOpen();
   if (!windowCheck.isOpen) {
     return { error: windowCheck.message };
   }
   ```

2. **Check Monthly Limit** (only for NEW assessments, not edits)
   ```typescript
   if (!payload.assessmentId) {
     const monthlyCheck = await checkMonthlyAssessmentExists(user.id);
     if (monthlyCheck.hasExisting) {
       return { error: `You have already submitted... only one per month.` };
     }
   }
   ```

3. **Validate Required Fields**
   - Same as before (weight, height, waist, hip, wrist, 3 photos)

4. **Database Upsert**
   - If all checks pass, create/update assessment as `pending_approval`

---

## Error Handling & Messages

### Window Closed
```
"Assessment window is currently closed."
```
Shown in:
- Admin window control badge (red "✗ Closed")
- Error message when user tries to submit

### Monthly Limit Reached
```
"You have already submitted an assessment for May 2026. 
Only one assessment per month is allowed."
```
Shown in:
- Locked badge on My Assessment page
- Error message if user tries to bypass

### Both Conditions Prevent Submission
1. **Frontend**: Button disabled or replaced with badge
2. **Backend**: 403 Forbidden response if user bypasses UI

---

## File Structure Summary

### New Files Created:
```
assessment-window-migration.sql
src/app/system_admin/assessments/
  ├── assessment-window-actions.ts      (Backend validators)
  ├── AssessmentWindowControl.tsx       (Admin UI component)
src/app/user/assessment/
  ├── AssessmentConfirmDialog.tsx       (Confirmation dialog)
  ├── NewAssessmentButton.tsx           (Monthly check + button)
```

### Files Modified:
```
src/app/user/assessment/actions.ts
  └── Added imports + validation checks in saveDraft()

src/app/user/assessment/page.tsx
  └── Replaced button logic with NewAssessmentButton component

src/app/system_admin/assessments/page.tsx
  └── Added AssessmentWindowControl component
```

---

## Testing Checklist

- [ ] **Database**: Run migration successfully in Supabase
- [ ] **Admin Controls**: Set assessment window dates on BMI Results page
- [ ] **Window Status**: Badge shows "Open" or "Closed" based on current date
- [ ] **Personnel Button**: Shows "New Assessment" when eligible
- [ ] **Personnel Button**: Shows locked badge when monthly limit reached
- [ ] **Confirmation Dialog**: Appears when clicking "New Assessment"
- [ ] **Dialog Actions**: Cancel closes dialog, Confirm navigates to add page
- [ ] **Backend Guard**: Try POST to `/user/assessment` outside window → 403
- [ ] **Backend Guard**: Try POST when already have assessment → 403
- [ ] **Edit Bypass**: Allow editing existing revision/returned assessments (not blocked by monthly limit)

---

## Usage Examples

### For System Admin:

1. Navigate to `/system_admin/assessments`
2. Scroll to "Assessment Window Control" section
3. Set start date to "2026-05-01" and end date to "2026-05-31"
4. Click "Save Window"
5. Badge shows "✓ Open"
6. Personnel can now submit assessments

To close the window:
1. Set end date to yesterday
2. Click "Save Window"
3. Badge shows "✗ Closed"
4. Personnel see locked badge instead of button

### For Personnel:

1. Navigate to `/user/assessment`
2. If no assessment for current month:
   - See "New Assessment" button
   - Click button → Confirmation dialog appears
   - Review warning text
   - Click "Confirm & Submit" → Navigate to form
3. If already submitted assessment:
   - See locked badge: "May 2026 Assessment Completed"
   - Button is hidden/disabled

---

## Security Notes

1. **RLS Policies**: Only system_admins can write to `assessment_windows`
2. **Backend Validation**: Core checks run server-side in `saveDraft()` (can't be bypassed)
3. **Double-Check**: `validateAssessmentSubmission()` called before any database write
4. **Edit Exemption**: Users editing "revision_required" or "returned" assessments are not blocked by monthly limit

---

## Future Enhancements

- Email notifications when assessment window opens/closes
- Dashboard showing which personnel have/haven't submitted for month
- Configurable monthly window (currently hard-coded to calendar month)
- Assessment history view showing past windows and submission rates
