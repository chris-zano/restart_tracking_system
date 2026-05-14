"use client";

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export type AttendanceTrendPoint = {
  label: string;
  rate: number;
  cohortName: string;
};

export type WeeklyCompletionPoint = {
  week: string;
  rate: number;
  labRate: number;
  kcRate: number;
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function AttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  if (data.length === 0) return <EmptyState message="No sessions recorded yet." />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [`${value}%`, "Attendance"]}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3, fill: "#3b82f6" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WeeklyCompletionChart({ data }: { data: WeeklyCompletionPoint[] }) {
  if (data.length === 0) return <EmptyState message="No assignment report uploaded yet." />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value, name) => [
            `${value}%`,
            name === "labRate" ? "Labs" : name === "kcRate" ? "Knowledge Checks" : "Overall",
          ]}
          contentStyle={{ fontSize: 12 }}
        />
        <Legend
          formatter={(value) =>
            value === "labRate" ? "Labs" : value === "kcRate" ? "Knowledge Checks" : "Overall"
          }
          wrapperStyle={{ fontSize: 11 }}
        />
        <Bar dataKey="labRate" fill="#3b82f6" radius={[3, 3, 0, 0]} name="labRate" />
        <Bar dataKey="kcRate" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="kcRate" />
      </BarChart>
    </ResponsiveContainer>
  );
}
