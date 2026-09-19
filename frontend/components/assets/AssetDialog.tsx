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
import { parseDate } from "@/lib/parsers"
import type { Asset, AssetType } from "@/lib/types"

const ASSET_TYPES: { value: AssetType; label: string; defaultRate: string }[] = [
  { value: "real_estate", label: "Real Estate", defaultRate: "6" },
  { value: "vehicle", label: "Vehicle", defaultRate: "-15" },
  { value: "other", label: "Other", defaultRate: "0" },
]

interface Props {
  mode: "create" | "edit"
  asset?: Asset
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AssetDialog({ mode, asset, open, onOpenChange, onSuccess }: Props) {
  const [name, setName] = useState("")
  const [assetType, setAssetType] = useState<AssetType>("real_estate")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [growthRate, setGrowthRate] = useState("6")
  const [ownershipPct, setOwnershipPct] = useState("100")
  const [notes, setNotes] = useState("")

  // Sold-asset fields
  const [isSold, setIsSold] = useState(false)
  const [soldDate, setSoldDate] = useState("")
  const [soldFor, setSoldFor] = useState("")
  const [impliedRate, setImpliedRate] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedPurchaseDate = parseDate(purchaseDate)
  const parsedSoldDate = parseDate(soldDate)

  useEffect(() => {
    if (open) {
      setName(asset?.name ?? "")
      setAssetType(asset?.asset_type ?? "real_estate")
      setPurchasePrice(asset ? String(asset.purchase_price) : "")
      setPurchaseDate(asset?.purchase_date ?? "")
      setGrowthRate(asset ? String(asset.annual_growth_rate * 100) : "6")
      setOwnershipPct(asset ? String(Math.round(asset.ownership_pct * 100)) : "100")
      setNotes(asset?.notes ?? "")
      setIsSold(asset?.sold_at != null)
      setSoldDate(asset?.sold_at ?? "")
      setSoldFor(asset?.sold_for != null ? String(asset.sold_for) : "")
      setImpliedRate(null)
      setError(null)
    }
  }, [open, asset])

  // Auto-compute implied annual growth rate when all four values are available
  useEffect(() => {
    if (!isSold) { setImpliedRate(null); return }
    const pd = parsedPurchaseDate
    const sd = parsedSoldDate
    const price = parseFloat(purchasePrice)
    const sale = parseFloat(soldFor)
    if (!pd || !sd || isNaN(price) || price <= 0 || isNaN(sale) || sale <= 0) {
      setImpliedRate(null)
      return
    }
    const days = (new Date(sd).getTime() - new Date(pd).getTime()) / 86_400_000
    if (days <= 0) { setImpliedRate(null); return }
    const years = days / 365.25
    const rate = (sale / price) ** (1 / years) - 1
    const pct = (rate * 100).toFixed(2)
    setImpliedRate(pct)
    setGrowthRate(pct)
  }, [isSold, parsedPurchaseDate, parsedSoldDate, purchasePrice, soldFor])

  const handleTypeChange = (v: AssetType) => {
    setAssetType(v)
    const found = ASSET_TYPES.find((t) => t.value === v)
    if (found && !asset) setGrowthRate(found.defaultRate)
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Name is required"); return }
    const price = parseFloat(purchasePrice)
    const rate = parseFloat(growthRate) / 100
    const pct = parseFloat(ownershipPct) / 100
    if (mode === "create" && (isNaN(price) || price <= 0)) { setError("Purchase price must be > 0"); return }
    if (mode === "create" && !parsedPurchaseDate) { setError("Purchase date is required"); return }
    if (isNaN(pct) || pct < 0 || pct > 1) { setError("Ownership must be 0–100"); return }
    if (isSold && !parsedSoldDate) { setError("Enter a valid sold date"); return }
    if (isSold && isNaN(parseFloat(soldFor))) { setError("Enter a valid sale price"); return }

    setLoading(true)
    setError(null)
    try {
      if (mode === "create") {
        await api.assets.create({
          name: name.trim(),
          asset_type: assetType,
          purchase_price: price,
          purchase_date: parsedPurchaseDate!,
          annual_growth_rate: rate,
          ownership_pct: pct,
          notes: notes.trim() || null,
          sold_at: isSold ? parsedSoldDate : null,
          sold_for: isSold ? parseFloat(soldFor) : null,
        })
      } else {
        await api.assets.update(asset!.id, {
          name: name.trim(),
          annual_growth_rate: rate,
          ownership_pct: pct,
          notes: notes.trim() || null,
          sold_at: isSold ? parsedSoldDate : null,
          sold_for: isSold ? parseFloat(soldFor) : null,
        })
      }
      onSuccess()
      onOpenChange(false)
    } catch {
      setError("Failed to save. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Asset" : "Edit Asset"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a physical asset. For historical sold assets, check the 'Sold' box."
              : "Update asset details and growth rate."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bolig Hegdehaugsveien" />
          </div>
          {mode === "create" && (
            <>
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select value={assetType} onValueChange={(v) => handleTypeChange(v as AssetType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Purchase Price (NOK)</Label>
                <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="4300000" />
              </div>
              <div className="grid gap-1.5">
                <Label>Purchase Date</Label>
                <Input
                  type="text"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  placeholder="15.06.2018 or 2018-06-15"
                />
                {purchaseDate && (
                  <p className="text-xs text-muted-foreground">
                    {parsedPurchaseDate ? `Parsed as: ${parsedPurchaseDate}` : "Could not parse date"}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Sold section */}
          <div className="flex items-center gap-2">
            <input
              id="sold-toggle"
              type="checkbox"
              checked={isSold}
              onChange={(e) => setIsSold(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="sold-toggle" className="cursor-pointer">
              {mode === "create" ? "This asset was sold (historical)" : "Sold"}
            </Label>
          </div>

          {isSold && (
            <div className="grid gap-3 pl-2 border-l-2 border-primary/30">
              <div className="grid gap-1.5">
                <Label>Sold Date</Label>
                <Input
                  type="text"
                  value={soldDate}
                  onChange={(e) => setSoldDate(e.target.value)}
                  placeholder="01.03.2022 or 2022-03-01"
                />
                {soldDate && (
                  <p className="text-xs text-muted-foreground">
                    {parsedSoldDate ? `Parsed as: ${parsedSoldDate}` : "Could not parse date"}
                  </p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>Sale Price (NOK)</Label>
                <Input
                  type="number"
                  value={soldFor}
                  onChange={(e) => setSoldFor(e.target.value)}
                  placeholder="5200000"
                />
              </div>
              {impliedRate !== null && (
                <p className="text-xs text-muted-foreground">
                  Implied annual growth rate: <span className="font-medium text-foreground">{impliedRate}%</span> — applied automatically below.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>Annual Growth Rate (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={growthRate}
              onChange={(e) => { setGrowthRate(e.target.value); setImpliedRate(null) }}
              placeholder="6"
            />
            <p className="text-xs text-muted-foreground">Positive = appreciation, negative = depreciation</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Ownership (%)</Label>
            <Input type="number" min={0} max={100} value={ownershipPct} onChange={(e) => setOwnershipPct(e.target.value)} placeholder="100" />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Shared with partner" />
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
