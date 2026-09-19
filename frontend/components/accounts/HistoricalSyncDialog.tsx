"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"
import { formatNOK } from "@/lib/formatters"
import { parseDate, parseValue } from "@/lib/parsers"
import type { Account } from "@/lib/types"

interface ParsedRow {
  rawDate: string
  rawValue: string
  date: string | null
  value: number | null
}

interface Props {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function HistoricalSyncDialog({ account, open, onOpenChange, onSuccess }: Props) {
  const [datesText, setDatesText] = useState("")
  const [valuesText, setValuesText] = useState("")
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setDatesText("")
      setValuesText("")
      setImporting(false)
      setProgress(null)
      setError(null)
    }
  }, [open])

  const rows: ParsedRow[] = useMemo(() => {
    const dateLines = datesText.split("\n")
    const valueLines = valuesText.split("\n")
    const len = Math.max(dateLines.length, valueLines.length)
    const result: ParsedRow[] = []
    for (let i = 0; i < len; i++) {
      const rawDate = (dateLines[i] ?? "").trim()
      const rawValue = (valueLines[i] ?? "").trim()
      if (!rawDate && !rawValue) continue
      result.push({
        rawDate,
        rawValue,
        date: rawDate ? parseDate(rawDate) : null,
        value: rawValue ? parseValue(rawValue) : null,
      })
    }
    return result
  }, [datesText, valuesText])

  const validRows = rows.filter((r) => r.date !== null && r.value !== null)

  const handleImport = async () => {
    if (validRows.length === 0) return
    setImporting(true)
    setError(null)
    let done = 0
    try {
      for (const row of validRows) {
        await api.accounts.snapshots.create(account.id, {
          deposit: row.value!,
          unrealized_return: 0,
          recorded_at: `${row.date}T12:00:00`,
        })
        done++
        setProgress(`Imported ${done} / ${validRows.length}`)
      }
      onSuccess()
      onOpenChange(false)
    } catch {
      setError(`Failed after ${done} entries. Please try again.`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Load Historical Data — {account.name}</DialogTitle>
          <DialogDescription>
            Paste a list of dates in the left box and matching values in the right box — one per line.
            Supports formats like 15.06.2024, 6/28/2022, 2024-01-01 and values like -kr 14 974,14 or −7935.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-1.5">
            <Label>Dates</Label>
            <textarea
              className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder={"15.06.2024\n01.07.2024\n2024-08-01"}
              value={datesText}
              onChange={(e) => setDatesText(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Values (NOK)</Label>
            <textarea
              className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              placeholder={"-kr 14 974,14\n−7 929,23\n50000"}
              value={valuesText}
              onChange={(e) => setValuesText(e.target.value)}
            />
          </div>
        </div>

        {rows.length > 0 && (
          <div className="max-h-56 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raw date</TableHead>
                  <TableHead>Raw value</TableHead>
                  <TableHead>Parsed date</TableHead>
                  <TableHead className="text-right">Parsed value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const ok = r.date !== null && r.value !== null
                  return (
                    <TableRow key={i} className={ok ? "" : "opacity-50"}>
                      <TableCell className="font-mono text-xs">{r.rawDate || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.rawValue || "—"}</TableCell>
                      <TableCell className="text-xs">{r.date ?? "?"}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {r.value !== null ? formatNOK(r.value) : "?"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {ok ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-destructive">✗ skip</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Cancel</Button>
          <Button onClick={handleImport} disabled={importing || validRows.length === 0}>
            {importing ? "Importing…" : `Import ${validRows.length} entr${validRows.length === 1 ? "y" : "ies"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
