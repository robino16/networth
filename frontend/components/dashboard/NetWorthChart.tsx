"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNOK, formatMonthYear } from "@/lib/formatters";
import type { SummaryPoint } from "@/lib/types";

interface Props {
  data: SummaryPoint[];
  includeUnrealized: boolean;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="mb-1.5 font-medium text-foreground">
        {label ? formatDate(String(label)) : ""}
      </p>
      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center justify-between gap-6"
        >
          <span className="text-muted-foreground">{entry.name}</span>
          <span
            className="font-medium tabular-nums"
            style={{ color: entry.color }}
          >
            {formatNOK(Number(entry.value))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function NetWorthChart({ data, includeUnrealized }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Net Worth Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No data yet — add accounts and record snapshots to see your history.
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((p) => ({
    date: p.date,
    "Net Worth": includeUnrealized
      ? p.net_worth
      : p.net_worth - p.unrealized_return,
    Deposits: p.deposits,
    Assets: p.asset_value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Net Worth Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, left: 8, bottom: 4 }}
          >
            <defs>
              <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => formatMonthYear(v)}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatNOK(v)}
              tick={{ fontSize: 11 }}
              width={100}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="Net Worth"
              stroke="#2563eb"
              fill="url(#netWorthGrad)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
