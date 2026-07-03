"use client"

import { useEffect, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/lib/api"
import type { Account, AccountType } from "@/lib/types"

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "bank", label: "Bank (checking)" },
  { value: "savings", label: "Savings" },
  { value: "loan", label: "Loan" },
  { value: "funds", label: "Funds (ASK)" },
  { value: "stocks", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
  { value: "pension", label: "Pension (locked funds)" },
  { value: "other", label: "Other" },
]

interface Props {
  mode: "create" | "edit"
  account?: Account
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AccountDialog({ mode, account, open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [accountType, setAccountType] = useState<AccountType>("bank")
  const [ownershipPct, setOwnershipPct] = useState("100")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(account?.name ?? "")
      setAccountType(account?.account_type ?? "bank")
      setOwnershipPct(account ? String(Math.round(account.ownership_pct * 100)) : "100")
      setNotes(account?.notes ?? "")
      setError(null)
    }
  }, [open, account])

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Name is required"); return }
    const pct = parseFloat(ownershipPct) / 100
    if (isNaN(pct) || pct < 0 || pct > 1) { setError("Ownership must be 0–100"); return }
    setLoading(true)
    setError(null)
    try {
      const payload = { name: name.trim(), account_type: accountType, ownership_pct: pct, notes: notes.trim() || null }
      if (mode === "create") {
        await api.accounts.create(payload)
      } else {
        await api.accounts.update(account!.id, { name: payload.name, ownership_pct: pct, notes: payload.notes })
      }
      onSuccess()
      onOpenChange(false)
    } catch {
      setError("Failed to save. Check that the backend is running.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Account" : "Edit Account"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Add a new financial account to track." : "Update account details."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DNB Brukskonto" />
          </div>
          {mode === "create" && (
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="ownership">Ownership (%)</Label>
            <Input
              id="ownership"
              type="number"
              min={0}
              max={100}
              value={ownershipPct}
              onChange={(e) => setOwnershipPct(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Shared with partner" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : mode === "create" ? "Add" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
