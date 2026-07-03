import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatNOK } from "@/lib/formatters"
import type { CurrentSummary } from "@/lib/types"

interface Props {
  summary: CurrentSummary
  includeUnrealized: boolean
}

export function SummaryCards({ summary, includeUnrealized }: Props) {
  const netWorth = includeUnrealized
    ? summary.net_worth
    : summary.net_worth - summary.unrealized_return

  const cards = [
    {
      title: "Net Worth",
      value: netWorth,
      sub: includeUnrealized ? "incl. unrealized returns" : "excl. unrealized returns",
    },
    {
      title: "Total Loans",
      value: summary.total_loans_personal,
      sub: "personal share (ownership %)",
    },
    {
      title: "Cash & Deposits",
      value: summary.total_deposits,
      sub: "innskudd, personal share",
    },
    {
      title: "Unrealized Return",
      value: summary.unrealized_return,
      sub: "urealisert avkastning",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ title, value, sub }) => (
        <Card key={title}>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className={cn("text-xl font-bold tabular-nums", value < 0 && "text-destructive")}>
              {formatNOK(value)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
