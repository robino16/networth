import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatNOK } from "@/lib/formatters"

export interface GrowthPeriod {
  pct: number | null
  amount: number
}

interface GrowthCardProps {
  title: string
  growth: GrowthPeriod | null
}

function GrowthCard({ title, growth }: GrowthCardProps) {
  const isPositive = growth !== null && growth.amount >= 0
  const isNegative = growth !== null && growth.amount < 0
  const hasData = growth !== null

  const pctDisplay = () => {
    if (!hasData || growth.pct === null) return "—"
    const sign = growth.pct >= 0 ? "+" : ""
    return `${sign}${growth.pct.toFixed(1)}%`
  }

  const colorClass = !hasData || growth.pct === null
    ? "text-muted-foreground"
    : isPositive
    ? "text-emerald-600"
    : "text-destructive"

  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className={cn("text-2xl font-bold tabular-nums", colorClass)}>
          {pctDisplay()}
        </p>
        {hasData && (
          <p className={cn("mt-0.5 text-xs tabular-nums", isNegative ? "text-destructive/70" : "text-muted-foreground")}>
            {growth.amount >= 0 ? "+" : ""}{formatNOK(growth.amount)}
          </p>
        )}
        {!hasData && (
          <p className="mt-0.5 text-xs text-muted-foreground">no data</p>
        )}
      </CardContent>
    </Card>
  )
}

interface Props {
  lastMonth: GrowthPeriod | null
  lastYear: GrowthPeriod | null
}

export function GrowthCards({ lastMonth, lastYear }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <GrowthCard title="Growth Last Month" growth={lastMonth} />
      <GrowthCard title="Growth Last Year" growth={lastYear} />
    </div>
  )
}
