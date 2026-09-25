import { accountsRepo } from "./repositories/accounts"
import { assetsRepo } from "./repositories/assets"
import { snapshotsRepo } from "./repositories/snapshots"
import type { Account, Asset, Snapshot } from "./types"

interface ExportData {
  version: 1
  exported_at: string
  accounts: Account[]
  snapshots: Snapshot[]
  assets: Asset[]
}

export async function exportData(): Promise<void> {
  const [accounts, snapshots, assets] = await Promise.all([
    accountsRepo.getAll(true),
    snapshotsRepo.getAll(),
    assetsRepo.getAll(true),
  ])

  const payload: ExportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    accounts,
    snapshots,
    assets,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `networth-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importData(file: File): Promise<void> {
  const text = await file.text()
  const data = JSON.parse(text) as ExportData
  if (data.version !== 1) throw new Error("Unknown backup format version")

  for (const account of data.accounts) {
    await accountsRepo.save(account)
  }
  for (const snapshot of data.snapshots) {
    await snapshotsRepo.save(snapshot)
  }
  for (const asset of data.assets) {
    await assetsRepo.save(asset)
  }
}
