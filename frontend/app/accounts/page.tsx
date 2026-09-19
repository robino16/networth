"use client"

import { useRef, useState } from "react"
import useSWR from "swr"
import { Download, Plus, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccountsTable } from "@/components/accounts/AccountsTable"
import { AccountDialog } from "@/components/accounts/AccountDialog"
import { fetcher } from "@/lib/api"
import { exportData, importData } from "@/lib/exportImport"
import type { AccountWithSnapshot } from "@/lib/types"

export default function AccountsPage() {
  const { data, mutate } = useSWR<AccountWithSnapshot[]>("/api/accounts", fetcher)
  const [addOpen, setAddOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    try {
      await importData(file)
      await mutate()
    } catch {
      setImportError("Failed to import — make sure the file is a valid backup.")
    } finally {
      e.target.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportData()}>
            <Download className="mr-1 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-1" />
            Add Account
          </Button>
        </div>
      </div>
      {importError && <p className="text-sm text-destructive">{importError}</p>}

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
