"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
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
import { AssetDialog } from "./AssetDialog"
import { api } from "@/lib/api"
import { formatNOK, formatDate, formatPct, formatGrowthRate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { Asset } from "@/lib/types"

const TYPE_LABELS: Record<string, string> = {
  real_estate: "Real Estate",
  vehicle: "Vehicle",
  other: "Other",
}

interface Props {
  assets: Asset[]
  onMutate: () => void
}

export function AssetsTable({ assets, onMutate }: Props) {
  const [editAsset, setEditAsset] = useState<Asset | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this asset?")) return
    await api.assets.delete(id)
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
              <TableHead className="text-right">Purchase Price</TableHead>
              <TableHead className="text-right">Growth Rate</TableHead>
              <TableHead className="text-right">Value / Sold For</TableHead>
              <TableHead className="text-right">My Share</TableHead>
              <TableHead className="text-right">Ownership</TableHead>
              <TableHead>Purchased</TableHead>
              <TableHead>Sold</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                  No assets yet — add one above.
                </TableCell>
              </TableRow>
            )}
            {assets.map((asset) => {
              const sold = asset.sold_at != null
              return (
              <TableRow key={asset.id} className={sold ? "opacity-60" : ""}>
                <TableCell className="font-medium">
                  {asset.name}
                  {sold && <Badge variant="outline" className="ml-2 text-xs">Sold</Badge>}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{TYPE_LABELS[asset.asset_type]}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatNOK(asset.purchase_price)}</TableCell>
                <TableCell className={cn("text-right tabular-nums", asset.annual_growth_rate < 0 && "text-destructive")}>
                  {formatGrowthRate(asset.annual_growth_rate)}
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {sold
                    ? <span className="text-muted-foreground">{asset.sold_for != null ? formatNOK(asset.sold_for) : "—"}</span>
                    : formatNOK(asset.current_estimated_value)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {sold ? <span className="text-muted-foreground">—</span> : formatNOK(asset.current_estimated_value * asset.ownership_pct)}
                </TableCell>
                <TableCell className="text-right">{formatPct(asset.ownership_pct)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(asset.purchase_date)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{asset.sold_at ? formatDate(asset.sold_at) : "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon-sm" variant="ghost" title="Edit" onClick={() => setEditAsset(asset)}>
                      <Pencil />
                    </Button>
                    <Button size="icon-sm" variant="ghost" title="Remove" onClick={() => handleDelete(asset.id)}>
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

      {editAsset && (
        <AssetDialog
          mode="edit"
          asset={editAsset}
          open={!!editAsset}
          onOpenChange={(o) => !o && setEditAsset(null)}
          onSuccess={onMutate}
        />
      )}
    </>
  )
}
