"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatNOK } from "@/lib/formatters"

export interface BreakdownSlice {
  name: string
  value: number
}

const COLORS = [
  "#2563eb", "#16a34a", "#7c3aed", "#d97706",
  "#0891b2", "#be185d", "#65a30d", "#9ca3af",
]

interface Props {
  data: BreakdownSlice[]
}

function SliceTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>
}) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <div className="flex items-center justify-between gap-6">
        <span className="text-muted-foreground">{item.name}</span>
        <span className="font-medium tabular-nums text-foreground">{formatNOK(Number(item.value))}</span>
      </div>
    </div>
  )
}

export function BreakdownChart({ data }: Props) {
  const positive = data.filter((d) => d.value > 0)

  if (positive.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Asset Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No assets to display yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Asset Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={positive}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              nameKey="name"
            >
              {positive.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
