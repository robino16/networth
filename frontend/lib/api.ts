import { accountsRepo } from "./repositories/accounts"
import { assetsRepo } from "./repositories/assets"
import { snapshotsRepo } from "./repositories/snapshots"
import { summaryService } from "./services/summary"
import type {
  Account,
  AccountWithSnapshot,
  Asset,
  CreateAccountInput,
  CreateAssetInput,
  CreateSnapshotInput,
  Snapshot,
  UpdateAccountInput,
  UpdateAssetInput,
  UpdateSnapshotInput,
} from "./types"

// Used by SWR — routes the string key to the correct local service call.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const fetcher = async (path: string): Promise<any> => {
  const url = new URL(path, "http://x")
  const { pathname, searchParams } = url
  const excludeAccounts = searchParams.getAll("exclude_accounts")
  const excludeAssets = searchParams.getAll("exclude_assets")

  if (pathname === "/api/accounts") {
    const [accounts, latestSnapshots] = await Promise.all([
      accountsRepo.getAll(),
      snapshotsRepo.getLatestForAll(),
    ])
    return accounts.map(
      (account): AccountWithSnapshot => ({
        account,
        latest_snapshot: latestSnapshots[account.id] ?? null,
      }),
    )
  }

  if (pathname === "/api/assets") return assetsRepo.getAll()

  if (pathname === "/api/summary/current") {
    return summaryService.getCurrent(excludeAccounts, excludeAssets)
  }

  if (pathname === "/api/summary/history") {
    const from = searchParams.get("from_date") ?? undefined
    const to = searchParams.get("to_date") ?? undefined
    return summaryService.getHistory(from, to, excludeAccounts, excludeAssets)
  }

  const accountByIdMatch = pathname.match(/^\/api\/accounts\/([^/]+)$/)
  if (accountByIdMatch) return accountsRepo.getById(accountByIdMatch[1])

  const snapshotMatch = pathname.match(/^\/api\/accounts\/([^/]+)\/snapshots$/)
  if (snapshotMatch) return snapshotsRepo.getForAccount(snapshotMatch[1])

  throw new Error(`Unknown path: ${path}`)
}

export const api = {
  accounts: {
    list: (): Promise<AccountWithSnapshot[]> => fetcher("/api/accounts") as Promise<AccountWithSnapshot[]>,

    create: async (data: CreateAccountInput): Promise<Account> => {
      const account: Account = {
        id: crypto.randomUUID(),
        name: data.name,
        account_type: data.account_type,
        ownership_pct: data.ownership_pct,
        currency: "NOK",
        notes: data.notes ?? null,
        is_active: true,
        created_at: new Date().toISOString(),
      }
      return accountsRepo.save(account)
    },

    update: (id: string, data: UpdateAccountInput): Promise<Account> =>
      accountsRepo.update(id, data),

    delete: (id: string): Promise<void> => accountsRepo.delete(id),

    reorder: (orderedIds: string[]): Promise<void> => accountsRepo.reorder(orderedIds),

    snapshots: {
      list: (id: string): Promise<Snapshot[]> => snapshotsRepo.getForAccount(id),

      create: async (accountId: string, data: CreateSnapshotInput): Promise<Snapshot> => {
        const snapshot: Snapshot = {
          id: crypto.randomUUID(),
          account_id: accountId,
          recorded_at: data.recorded_at ?? new Date().toISOString(),
          deposit: data.deposit,
          unrealized_return: data.unrealized_return ?? 0,
          total: data.deposit + (data.unrealized_return ?? 0),
        }
        return snapshotsRepo.save(snapshot)
      },

      update: (
        _accountId: string,
        snapshotId: string,
        data: UpdateSnapshotInput,
      ): Promise<Snapshot> => snapshotsRepo.update(snapshotId, data),

      delete: (_accountId: string, snapshotId: string): Promise<void> =>
        snapshotsRepo.delete(snapshotId),
    },
  },

  assets: {
    list: (): Promise<Asset[]> => assetsRepo.getAll(),

    create: async (data: CreateAssetInput): Promise<Asset> => {
      const asset: Asset = {
        id: crypto.randomUUID(),
        name: data.name,
        asset_type: data.asset_type,
        purchase_price: data.purchase_price,
        purchase_date: data.purchase_date,
        annual_growth_rate: data.annual_growth_rate,
        ownership_pct: data.ownership_pct ?? 1.0,
        notes: data.notes ?? null,
        sold_at: data.sold_at ?? null,
        sold_for: data.sold_for ?? null,
        is_active: true,
        created_at: new Date().toISOString(),
        current_estimated_value: 0,
      }
      return assetsRepo.save(asset)
    },

    update: (id: string, data: UpdateAssetInput): Promise<Asset> =>
      assetsRepo.update(id, data),

    delete: (id: string): Promise<void> => assetsRepo.delete(id),
  },

  summary: {
    current: (excludeAccountIds?: string[]): Promise<import("./types").CurrentSummary> =>
      summaryService.getCurrent(excludeAccountIds),
    history: (
      from?: string,
      to?: string,
      excludeAccountIds?: string[],
    ): Promise<import("./types").SummaryPoint[]> =>
      summaryService.getHistory(from, to, excludeAccountIds),
  },
}
