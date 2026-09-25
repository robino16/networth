"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, History, Pencil, RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AccountDialog } from "./AccountDialog"
import { SnapshotDialog } from "./SnapshotDialog"
import { api } from "@/lib/api"
import { formatNOK, formatDate, formatPct } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { AccountWithSnapshot } from "@/lib/types"

const TYPE_LABELS: Record<string, string> = {
  bank: "Bank",
  savings: "Savings",
  loan: "Loan",
  funds: "Funds",
  stocks: "Stocks",
  crypto: "Crypto",
  pension: "Pension",
  other: "Other",
}

interface Props {
  rows: AccountWithSnapshot[]
  onMutate: () => void
}

export function AccountsTable({ rows, onMutate }: Props) {
  const [editRow, setEditRow] = useState<AccountWithSnapshot | null>(null)
  const [snapshotIndex, setSnapshotIndex] = useState<number | null>(null)

  const handleMove = async (idx: number, direction: "up" | "down") => {
    const newOrder = rows.map((r) => r.account.id)
    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    ;[newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]]
    await api.accounts.reorder(newOrder)
    onMutate()
  }

  const snapshotRow = snapshotIndex !== null ? (rows[snapshotIndex] ?? null) : null

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this account?")) return
    await api.accounts.delete(id)
    onMutate()
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Deposit</TableHead>
              <TableHead className="text-right">Unrealized</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Ownership</TableHead>
              <TableHead>Last updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  No accounts yet — add one above.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row, idx) => {
              const snap = row.latest_snapshot
              return (
                <TableRow key={row.account.id} className={snapshotIndex === idx ? "bg-muted/50" : undefined}>
                  <TableCell className="font-medium">{row.account.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{TYPE_LABELS[row.account.account_type]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {snap ? formatNOK(snap.deposit) : "—"}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", snap && snap.unrealized_return < 0 && "text-destructive")}>
                    {snap && snap.unrealized_return !== 0 ? formatNOK(snap.unrealized_return) : "—"}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums font-medium", snap && snap.total < 0 && "text-destructive")}>
                    {snap ? formatNOK(snap.total) : "—"}
                  </TableCell>
                  <TableCell className="text-right">{formatPct(row.account.ownership_pct)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {snap ? formatDate(snap.recorded_at) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" title="Move up" onClick={() => handleMove(idx, "up")} disabled={idx === 0}>
                        <ChevronUp />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Move down" onClick={() => handleMove(idx, "down")} disabled={idx === rows.length - 1}>
                        <ChevronDown />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Update balance" onClick={() => setSnapshotIndex(idx)}>
                        <RefreshCw />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="View history" asChild>
                        <Link href={`/accounts/${row.account.id}`}><History /></Link>
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Edit" onClick={() => setEditRow(row)}>
                        <Pencil />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Remove" onClick={() => handleDelete(row.account.id)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {editRow && (
        <AccountDialog
          mode="edit"
          account={editRow.account}
          open={!!editRow}
          onOpenChange={(o) => !o && setEditRow(null)}
          onSuccess={onMutate}
        />
      )}
      {snapshotRow && (
        <SnapshotDialog
          account={snapshotRow.account}
          latestSnapshot={snapshotRow.latest_snapshot}
          open={snapshotIndex !== null}
          onOpenChange={(o) => !o && setSnapshotIndex(null)}
          onSuccess={onMutate}
          onNext={() => setSnapshotIndex((i) => (i !== null ? i + 1 : null))}
          onPrev={() => setSnapshotIndex((i) => (i !== null ? i - 1 : null))}
          hasNext={snapshotIndex !== null && snapshotIndex < rows.length - 1}
          hasPrev={snapshotIndex !== null && snapshotIndex > 0}
          position={snapshotIndex !== null ? { current: snapshotIndex + 1, total: rows.length } : undefined}
        />
      )}
    </>
  )
}
