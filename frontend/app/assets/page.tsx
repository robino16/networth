"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AssetsTable } from "@/components/assets/AssetsTable"
import { AssetDialog } from "@/components/assets/AssetDialog"
import { fetcher } from "@/lib/api"
import type { Asset } from "@/lib/types"

export default function AssetsPage() {
  const { data, mutate } = useSWR<Asset[]>("/api/assets", fetcher)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Physical assets whose value is estimated from purchase price and annual growth rate.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1" />
          Add Asset
        </Button>
      </div>

      {data ? (
        <AssetsTable assets={data} onMutate={() => mutate()} />
      ) : (
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      )}

      <AssetDialog
        mode="create"
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => mutate()}
      />
    </div>
  )
}
