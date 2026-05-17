"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type DateRange } from "react-day-picker";
import {
  getAssessmentWindow,
  setAssessmentWindow,
  checkAssessmentWindowOpen,
} from "./assessment-window-actions";

/**
 * Get the current month string in YYYY-MM format
 */
function getCurrentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function AssessmentWindowControl() {
  const [monthStr, setMonthStr] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [isLateClosed, setIsLateClosed] = useState(false);
  const [hasWindow, setHasWindow] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const currentMonthLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  async function loadWindowData() {
    setIsLoading(true);

    try {
      const current = getCurrentMonthString();
      setMonthStr(current);

      const window = await getAssessmentWindow(current);
      if (window) {
        setStartDate(window.start_date);
        setEndDate(window.end_date);
        setHasWindow(true);
      } else {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
        setStartDate(firstDay);
        setEndDate(lastDay);
        setHasWindow(false);
      }

      const windowCheck = await checkAssessmentWindowOpen();
      setIsWindowOpen(windowCheck.isOpen);
      setIsLateClosed(windowCheck.isLateClosed);
    } catch (error) {
      console.error("Failed to load assessment window:", error);
      toast.error("Failed to load assessment window");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWindowData();
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      const from = startDate ? new Date(startDate) : undefined;
      const to = endDate ? new Date(endDate) : undefined;
      // DateRange requires `from` to be Date (not undefined); fall back to undefined range
      setDate(from ? { from, to } : undefined);
    }
  }, [dialogOpen, startDate, endDate]);

  async function handleSave() {
    if (!date?.from || !date?.to) {
      toast.error("Please select both start and end dates");
      return;
    }

    const formattedStartDate = date.from.toISOString().split("T")[0];
    const formattedEndDate = date.to.toISOString().split("T")[0];

    if (formattedStartDate > formattedEndDate) {
      toast.error("Start date must be before or equal to end date");
      return;
    }

    setIsSaving(true);

    try {
      const result = await setAssessmentWindow(monthStr, formattedStartDate, formattedEndDate);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setStartDate(formattedStartDate);
      setEndDate(formattedEndDate);

      const now = new Date();
      const start = new Date(formattedStartDate);
      const end = new Date(formattedEndDate);
      const isOpen = now >= start && now <= end;
      setIsWindowOpen(isOpen);
      setIsLateClosed(!isOpen && now > end);
      setHasWindow(true);

      toast.success("Submission window updated successfully");
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to update assessment window:", error);
      toast.error("Failed to update assessment window");
    } finally {
      setIsSaving(false);
    }
  }

  const windowText = hasWindow
    ? `Submission Window: ${startDate} to ${endDate}`
    : `No active submission window for ${currentMonthLabel}`;

  const lateOverrideHint = isLateClosed
    ? "Late submission is allowed for System Admins after the deadline."
    : null;

  const formatDisplayDate = (date?: Date) =>
    date
      ? date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Badge
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isWindowOpen ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
          }`}
        >
          {isWindowOpen ? "✓ Open" : "✗ Closed"}
          {isLateClosed ? " (Late Override)" : ""}
        </Badge>

        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-gray-600">
            {isLoading ? "Loading window..." : windowText}
          </span>
          {lateOverrideHint ? (
            <span className="text-sm text-amber-700">{lateOverrideHint}</span>
          ) : null}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            disabled={isLoading}
          >
            {hasWindow ? "Edit Window" : "Adjust Dates"}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Update Assessment Window</DialogTitle>
            <DialogDescription>
              Adjust the current month submission dates and save the new window.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="date-range">Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    aria-label="Select date range"
                  >
                    <span>
                      {date?.from && date?.to
                        ? `${formatDisplayDate(date.from)} - ${formatDisplayDate(date.to)}`
                        : "Select range"}
                    </span>
                    <CalendarIcon className="h-4 w-4 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={date}
                    onSelect={(range) => setDate(range)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              The dates below will apply to {currentMonthLabel}. If the current date falls within this range, the window will show as open.
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="size-4" />
              {isSaving ? "Saving..." : "Save Window"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
