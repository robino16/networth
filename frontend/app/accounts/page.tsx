"use client"

import { useState } from "react"
import useSWR from "swr"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccountsTable } from "@/components/accounts/AccountsTable"
import { AccountDialog } from "@/components/accounts/AccountDialog"
import { fetcher } from "@/lib/api"
import type { AccountWithSnapshot } from "@/lib/types"

export default function AccountsPage() {
  const { data, mutate } = useSWR<AccountWithSnapshot[]>("/api/accounts", fetcher)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1" />
          Add Account
        </Button>
      </div>

      {data ? (
        <AccountsTable rows={data} onMutate={() => mutate()} />
      ) : (
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      )}

      <AccountDialog
        mode="create"
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => mutate()}
      />
    </div>
  )
}
