"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { formatNOK } from "@/lib/formatters"
import { parseDate } from "@/lib/parsers"
import type { Account, Snapshot } from "@/lib/types"

const INVESTMENT_TYPES = ["stocks", "funds", "crypto", "pension", "other"]

interface Props {
  account: Account
  latestSnapshot?: Snapshot | null
  editSnapshot?: Snapshot
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onNext?: () => void
  onPrev?: () => void
  hasNext?: boolean
  hasPrev?: boolean
  position?: { current: number; total: number }
}

export function SnapshotDialog({
  account,
  latestSnapshot,
  editSnapshot,
  open,
  onOpenChange,
  onSuccess,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  position,
}: Props) {
  const isInvestment = INVESTMENT_TYPES.includes(account.account_type)
  const isEditMode = !!editSnapshot

  const [totalValue, setTotalValue] = useState("")
  const [unrealized, setUnrealized] = useState("")
  const [dateInput, setDateInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const parsedDate = parseDate(dateInput)

  useEffect(() => {
    if (!open) return
    const snap = editSnapshot ?? latestSnapshot ?? null
    if (isInvestment) {
      setTotalValue(snap ? String(snap.total) : "")
      setUnrealized(snap ? String(snap.unrealized_return) : "0")
    } else {
      setTotalValue(snap ? String(snap.deposit) : "")
      setUnrealized("0")
    }
    setDateInput(
      editSnapshot
        ? editSnapshot.recorded_at.slice(0, 10)
        : new Date().toISOString().slice(0, 10)
    )
    setError(null)
    setIsDirty(false)
    setSavedFlash(false)
  }, [open, account.id, latestSnapshot, editSnapshot, isInvestment])

  const showFlash = () => {
    setSavedFlash(true)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setSavedFlash(false), 1800)
  }

  const save = async (): Promise<boolean> => {
    const total = parseFloat(totalValue)
    const unr = parseFloat(unrealized)
    if (isNaN(total)) { setError("Enter a valid amount"); return false }
    if (!parsedDate) { setError("Enter a valid date (e.g. 15.06.2024 or 2024-06-15)"); return false }
    const deposit = isInvestment ? total - (isNaN(unr) ? 0 : unr) : total
    const unrealizedReturn = isInvestment ? (isNaN(unr) ? 0 : unr) : 0
    setLoading(true)
    setError(null)
    try {
      if (isEditMode) {
        await api.accounts.snapshots.update(account.id, editSnapshot!.id, {
          deposit,
          unrealized_return: unrealizedReturn,
          recorded_at: `${parsedDate}T12:00:00`,
        })
      } else {
        await api.accounts.snapshots.create(account.id, {
          deposit,
          unrealized_return: unrealizedReturn,
          recorded_at: `${parsedDate}T12:00:00`,
        })
      }
      onSuccess()
      setIsDirty(false)
      return true
    } catch {
      setError("Failed to save. Please try again.")
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndClose = async () => {
    const ok = await save()
    if (ok) onOpenChange(false)
  }

  const handleCancel = () => {
    if (isDirty && !confirm("Discard unsaved changes?")) return
    onOpenChange(false)
  }

  const handleNext = async () => {
    if (isDirty) {
      const ok = await save()
      if (!ok) return
      showFlash()
    }
    onNext?.()
  }

  const handlePrev = async () => {
    if (isDirty) {
      const ok = await save()
      if (!ok) return
      showFlash()
    }
    onPrev?.()
  }

  const markDirty = () => { if (!isDirty) setIsDirty(true) }

  const isLoan = account.account_type === "loan"
  const refSnap = editSnapshot ?? latestSnapshot
  const hasNav = !!(onNext || onPrev)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>
              {isEditMode ? "Edit Snapshot" : "Update Balance"} — {account.name}
            </DialogTitle>
            {position && (
              <span className="text-sm font-normal text-muted-foreground shrink-0">
                {position.current} / {position.total}
              </span>
            )}
          </div>
          <DialogDescription>
            {refSnap
              ? `Last recorded: ${formatNOK(refSnap.total)}`
              : "No previous snapshot."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="total">
              {isLoan ? "Outstanding loan (negative)" : isInvestment ? "Total value" : "Balance"}
            </Label>
            <Input
              id="total"
              type="number"
              value={totalValue}
              onChange={(e) => { setTotalValue(e.target.value); markDirty() }}
              placeholder={isLoan ? "-500000" : "50000"}
            />
          </div>
          {isInvestment && (
            <div className="grid gap-1.5">
              <Label htmlFor="unrealized">Unrealized return (urealisert avkastning)</Label>
              <Input
                id="unrealized"
                type="number"
                value={unrealized}
                onChange={(e) => { setUnrealized(e.target.value); markDirty() }}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Deposit (innskudd) = total − unrealized, computed automatically.
              </p>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="text"
              value={dateInput}
              onChange={(e) => { setDateInput(e.target.value); markDirty() }}
              placeholder="15.06.2024 or 2024-06-15"
            />
            {dateInput && (
              <p className="text-xs text-muted-foreground">
                {parsedDate ? `Parsed as: ${parsedDate}` : "Could not parse date"}
              </p>
            )}
            {!isEditMode && (
              <p className="text-xs text-muted-foreground">Set to a past date to backfill historical data.</p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="flex-row items-center justify-between sm:space-x-0">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            {savedFlash && (
              <span className="text-sm text-green-600 dark:text-green-400">Saved ✓</span>
            )}
            {hasNav && (
              <Button variant="outline" onClick={handlePrev} disabled={loading || !hasPrev}>
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
            )}
            {hasNav && (
              <Button variant="outline" onClick={handleNext} disabled={loading || !hasNext}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            <Button onClick={handleSaveAndClose} disabled={loading}>
              {loading ? "Saving…" : isEditMode ? "Save changes" : hasNav ? "Save & Close" : "Record"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
