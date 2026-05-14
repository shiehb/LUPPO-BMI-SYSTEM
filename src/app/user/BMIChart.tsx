"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

export interface ChartPoint {
  date: string;
  bmi: number;
  weight: number;
}

export default function BMIChart({ data }: { data: ChartPoint[] }) {
  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        At least 2 records needed to display a trend.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">BMI Trend</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={30} />
            <Tooltip />
            <ReferenceLine y={18.5} stroke="#93c5fd" strokeDasharray="4 4" />
            <ReferenceLine y={25}   stroke="#fde68a" strokeDasharray="4 4" />
            <ReferenceLine y={30}   stroke="#fca5a5" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="bmi" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="BMI" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Weight Trend (kg)</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={30} />
            <Tooltip />
            <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Weight (kg)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
