"use client"

import { use, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { ChevronLeft, History, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SnapshotDialog } from "@/components/accounts/SnapshotDialog"
import { HistoricalSyncDialog } from "@/components/accounts/HistoricalSyncDialog"
import { fetcher, api } from "@/lib/api"
import { formatNOK, formatDate, formatMonthYear } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { Account, Snapshot } from "@/lib/types"

function SnapshotTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="mb-1.5 font-medium text-foreground">{label ? formatMonthYear(String(label)) : ""}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-medium tabular-nums" style={{ color: entry.color }}>{formatNOK(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  )
}

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: account } = useSWR<Account>(`/api/accounts/${id}`, fetcher)
  const { data: snapshots, mutate: mutateSnapshots } = useSWR<Snapshot[]>(`/api/accounts/${id}/snapshots`, fetcher)

  const [editSnap, setEditSnap] = useState<Snapshot | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const handleDelete = async (snap: Snapshot) => {
    if (!confirm(`Delete snapshot from ${formatDate(snap.recorded_at)}?`)) return
    await api.accounts.snapshots.delete(id, snap.id)
    mutateSnapshots()
  }

  const chartData = (snapshots ?? []).map((s) => ({
    date: s.recorded_at,
    Deposit: s.deposit,
    "Unrealized Return": s.unrealized_return,
    Total: s.total,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/accounts"><ChevronLeft /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{account?.name ?? "Account"}</h1>
        </div>
        {account && (
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
            <History className="mr-2 h-4 w-4" />
            Load historical data
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Balance History</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No snapshots yet — go to Accounts and click Update.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tickFormatter={(v: string) => formatMonthYear(v)} tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tickFormatter={(v: number) => formatNOK(v)} tick={{ fontSize: 11 }} width={100} tickLine={false} axisLine={false} />
                <Tooltip content={<SnapshotTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="Deposit" stroke="#16a34a" fill="#16a34a20" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="Unrealized Return" stroke="#7c3aed" fill="#7c3aed10" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="Total" stroke="#2563eb" fill="#2563eb10" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Snapshot History</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
                <TableHead className="text-right">Unrealized Return</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(snapshots ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No snapshots recorded.</TableCell>
                </TableRow>
              )}
              {[...(snapshots ?? [])].reverse().map((snap) => (
                <TableRow key={snap.id}>
                  <TableCell>{formatDate(snap.recorded_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNOK(snap.deposit)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", snap.unrealized_return < 0 && "text-destructive")}>
                    {formatNOK(snap.unrealized_return)}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums font-medium", snap.total < 0 && "text-destructive")}>
                    {formatNOK(snap.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon-sm" variant="ghost" title="Edit" onClick={() => setEditSnap(snap)}>
                        <Pencil />
                      </Button>
                      <Button size="icon-sm" variant="ghost" title="Delete" onClick={() => handleDelete(snap)}>
                        <Trash2 className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {account && editSnap && (
        <SnapshotDialog
          account={account}
          editSnapshot={editSnap}
          open={!!editSnap}
          onOpenChange={(o) => !o && setEditSnap(null)}
          onSuccess={() => mutateSnapshots()}
        />
      )}
      {account && historyOpen && (
        <HistoricalSyncDialog
          account={account}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          onSuccess={() => mutateSnapshots()}
        />
      )}
    </div>
  )
}
