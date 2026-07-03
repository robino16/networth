"use client"

import { useState } from "react"
import useSWR from "swr"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { GrowthCards, type GrowthPeriod } from "@/components/dashboard/GrowthCards"
import { NetWorthChart } from "@/components/dashboard/NetWorthChart"
import { BreakdownChart, type BreakdownSlice } from "@/components/dashboard/BreakdownChart"
import { SavePresetDialog } from "@/components/dashboard/SavePresetDialog"
import { ConfirmDeleteDialog } from "@/components/dashboard/ConfirmDeleteDialog"
import { fetcher } from "@/lib/api"
import { cn } from "@/lib/utils"
import { usePresets } from "@/lib/usePresets"
import type { AccountWithSnapshot, Asset, CurrentSummary, Preset, SummaryPoint } from "@/lib/types"

const TYPE_LABELS: Record<string, string> = {
  bank: "Bank", savings: "Savings", funds: "Funds",
  stocks: "Stocks", crypto: "Crypto", pension: "Pension", other: "Other",
  real_estate: "Real Estate", vehicle: "Vehicle", loan: "Loan",
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  bank:         "bg-blue-500/15 text-blue-700 border-blue-500/30",
  savings:      "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  loan:         "bg-red-500/15 text-red-700 border-red-500/30",
  funds:        "bg-violet-500/15 text-violet-700 border-violet-500/30",
  stocks:       "bg-indigo-500/15 text-indigo-700 border-indigo-500/30",
  crypto:       "bg-amber-500/15 text-amber-700 border-amber-500/30",
  pension:      "bg-teal-500/15 text-teal-700 border-teal-500/30",
  other:        "bg-slate-500/15 text-slate-600 border-slate-400/30",
  real_estate:  "bg-orange-500/15 text-orange-700 border-orange-500/30",
  vehicle:      "bg-cyan-500/15 text-cyan-700 border-cyan-500/30",
}

export default function DashboardPage() {
  const [excludedAccountIds, setExcludedAccountIds] = useState<Set<string>>(new Set())
  const [excludedAssetIds, setExcludedAssetIds] = useState<Set<string>>(new Set())
  const [includeUnrealized, setIncludeUnrealized] = useState(true)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<Preset | null>(null)
  const { presets, savePreset, deletePreset } = usePresets()

  const { data: accounts } = useSWR<AccountWithSnapshot[]>("/api/accounts", fetcher)
  const { data: assets } = useSWR<Asset[]>("/api/assets", fetcher)

  const excludeQs = (() => {
    const params = new URLSearchParams()
    excludedAccountIds.forEach((id) => params.append("exclude_accounts", id))
    excludedAssetIds.forEach((id) => params.append("exclude_assets", id))
    const qs = params.toString()
    return qs ? `?${qs}` : ""
  })()

  const { data: summary } = useSWR<CurrentSummary>(`/api/summary/current${excludeQs}`, fetcher)
  const { data: history } = useSWR<SummaryPoint[]>(`/api/summary/history${excludeQs}`, fetcher)

  const growth = (() => {
    if (!history || history.length < 2) return { lastMonth: null, lastYear: null }
    const pointNW = (p: (typeof history)[0]) =>
      includeUnrealized ? p.net_worth : p.net_worth - p.unrealized_return
    const today = new Date()
    const curYear = today.getFullYear()
    const curMonth = today.getMonth() + 1
    const lmYear = curMonth === 1 ? curYear - 1 : curYear
    const lmMonth = curMonth === 1 ? 12 : curMonth - 1
    const currentNW = pointNW(history[history.length - 1])
    const makeGrowth = (match: (typeof history)[0] | undefined): GrowthPeriod | null => {
      if (!match) return null
      const prevNW = pointNW(match)
      const amount = currentNW - prevNW
      const pct = prevNW !== 0 ? (amount / Math.abs(prevNW)) * 100 : null
      return { pct, amount }
    }
    const findPoint = (year: number, month: number) =>
      history.findLast((p) => {
        const d = new Date(p.date)
        return d.getFullYear() === year && d.getMonth() + 1 === month
      })
    return {
      lastMonth: makeGrowth(findPoint(lmYear, lmMonth)),
      lastYear: makeGrowth(findPoint(curYear - 1, curMonth)),
    }
  })()

  const toggleAccount = (id: string) =>
    setExcludedAccountIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAsset = (id: string) =>
    setExcludedAssetIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allExcluded =
    (accounts?.every((a) => excludedAccountIds.has(a.account.id)) ?? true) &&
    (assets?.every((a) => excludedAssetIds.has(a.id)) ?? true)

  const toggleAll = () => {
    if (allExcluded) {
      setExcludedAccountIds(new Set())
      setExcludedAssetIds(new Set())
    } else {
      setExcludedAccountIds(new Set(accounts?.map((a) => a.account.id) ?? []))
      setExcludedAssetIds(new Set(assets?.map((a) => a.id) ?? []))
    }
  }

  const breakdown: BreakdownSlice[] = []
  if (accounts) {
    const byType: Record<string, number> = {}
    for (const { account, latest_snapshot } of accounts) {
      if (!latest_snapshot || account.account_type === "loan") continue
      if (excludedAccountIds.has(account.id)) continue
      const owned = latest_snapshot.total * account.ownership_pct
      byType[account.account_type] = (byType[account.account_type] ?? 0) + owned
    }
    for (const [type, value] of Object.entries(byType)) {
      breakdown.push({ name: TYPE_LABELS[type] ?? type, value })
    }
  }
  if (assets) {
    const byType: Record<string, number> = {}
    for (const asset of assets) {
      if (excludedAssetIds.has(asset.id)) continue
      const owned = asset.current_estimated_value * asset.ownership_pct
      byType[asset.asset_type] = (byType[asset.asset_type] ?? 0) + owned
    }
    for (const [type, value] of Object.entries(byType)) {
      breakdown.push({ name: TYPE_LABELS[type] ?? type, value })
    }
  }

  const hasAnyItems = (accounts && accounts.length > 0) || (assets && assets.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Switch
            id="unrealized-toggle"
            checked={includeUnrealized}
            onCheckedChange={setIncludeUnrealized}
          />
          <Label htmlFor="unrealized-toggle" className="text-sm">Include unrealized returns</Label>
        </div>
      </div>

      {hasAnyItems && (
        <div className="flex flex-wrap items-center gap-2">
          {accounts?.map(({ account }) => (
            <button
              key={account.id}
              onClick={() => toggleAccount(account.id)}
              className={cn(
                "inline-flex cursor-pointer select-none items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity",
                TYPE_BADGE_COLORS[account.account_type] ?? TYPE_BADGE_COLORS.other,
                excludedAccountIds.has(account.id) && "opacity-30 line-through",
              )}
            >
              {account.name}
            </button>
          ))}
          {assets?.map((asset) => (
            <button
              key={asset.id}
              onClick={() => toggleAsset(asset.id)}
              className={cn(
                "inline-flex cursor-pointer select-none items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity",
                TYPE_BADGE_COLORS[asset.asset_type] ?? TYPE_BADGE_COLORS.other,
                excludedAssetIds.has(asset.id) && "opacity-30 line-through",
              )}
            >
              {asset.name}
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={toggleAll}
          >
            {allExcluded ? "Select all" : "Deselect all"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setSaveDialogOpen(true)}
          >
            Save preset
          </Button>
        </div>
      )}

      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-1">Presets</span>
          {presets.map((preset) => (
            <span
              key={preset.id}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
              <button
                className="cursor-pointer"
                onClick={() => {
                  setExcludedAccountIds(new Set(preset.excludedAccountIds))
                  setExcludedAssetIds(new Set(preset.excludedAssetIds))
                }}
              >
                {preset.name}
              </button>
              <button
                className="cursor-pointer text-muted-foreground hover:text-destructive transition-colors leading-none"
                aria-label={`Delete preset ${preset.name}`}
                onClick={() => setPresetToDelete(preset)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {summary ? (
        <SummaryCards summary={summary} includeUnrealized={includeUnrealized} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      <GrowthCards lastMonth={growth.lastMonth} lastYear={growth.lastYear} />

      <div className="grid gap-6 lg:grid-cols-2">
        <NetWorthChart
          data={history ?? []}
          includeUnrealized={includeUnrealized}
        />
        <BreakdownChart data={breakdown} />
      </div>

      <SavePresetDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={(name) =>
          savePreset(
            name,
            Array.from(excludedAccountIds),
            Array.from(excludedAssetIds),
          )
        }
      />

      <ConfirmDeleteDialog
        open={presetToDelete !== null}
        onOpenChange={(open) => { if (!open) setPresetToDelete(null) }}
        presetName={presetToDelete?.name ?? ""}
        onConfirm={() => { if (presetToDelete) deletePreset(presetToDelete.id) }}
      />
    </div>
  )
}
