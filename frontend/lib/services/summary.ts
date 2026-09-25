import { accountsRepo } from "../repositories/accounts"
import { assetsRepo, computeEstimatedValue } from "../repositories/assets"
import { snapshotsRepo } from "../repositories/snapshots"
import type { CurrentSummary, Snapshot, SummaryPoint } from "../types"

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addOneMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getLatestAsOf(allSnapshots: Snapshot[], date: Date): Map<string, Snapshot> {
  const result = new Map<string, Snapshot>()
  for (const snap of allSnapshots) {
    if (new Date(snap.recorded_at) > date) continue
    const existing = result.get(snap.account_id)
    if (!existing || snap.recorded_at > existing.recorded_at) {
      result.set(snap.account_id, snap)
    }
  }
  return result
}

export const summaryService = {
  async getCurrent(
    excludeAccountIds: string[] = [],
    excludeAssetIds: string[] = [],
  ): Promise<CurrentSummary> {
    const excludeAccSet = new Set(excludeAccountIds)
    const excludeAssSet = new Set(excludeAssetIds)

    const [accounts, latestSnapshots, assets] = await Promise.all([
      accountsRepo.getAll(),
      snapshotsRepo.getLatestForAll(),
      assetsRepo.getAll(),
    ])

    let deposits = 0
    let unrealized = 0
    let loans = 0
    let loansPersonal = 0

    for (const account of accounts) {
      if (excludeAccSet.has(account.id)) continue
      const snap = latestSnapshots[account.id]
      if (!snap) continue
      if (account.account_type === "loan") {
        loans += snap.total
        loansPersonal += snap.total * account.ownership_pct
      } else {
        deposits += snap.deposit * account.ownership_pct
        unrealized += snap.unrealized_return * account.ownership_pct
      }
    }

    const assetValue = assets
      .filter((a) => !excludeAssSet.has(a.id))
      .reduce((sum, a) => sum + a.current_estimated_value * a.ownership_pct, 0)

    return {
      net_worth: deposits + unrealized + loansPersonal + assetValue,
      total_loans: loans,
      total_loans_personal: loansPersonal,
      total_deposits: deposits,
      unrealized_return: unrealized,
      asset_value: assetValue,
    }
  },

  async getHistory(
    fromDate?: string,
    toDate?: string,
    excludeAccountIds: string[] = [],
    excludeAssetIds: string[] = [],
  ): Promise<SummaryPoint[]> {
    const earliest = await snapshotsRepo.getEarliestDate()
    if (!earliest) return []

    const excludeAccSet = new Set(excludeAccountIds)
    const excludeAssSet = new Set(excludeAssetIds)

    const start = startOfMonth(fromDate ? new Date(fromDate) : earliest)
    const end = toDate ? new Date(toDate) : new Date()
    if (start > end) return []

    const [accounts, assets, allSnapshots] = await Promise.all([
      accountsRepo.getAll(),
      assetsRepo.getAll(),
      snapshotsRepo.getAll(),
    ])

    const accountMap = new Map(accounts.map((a) => [a.id, a]))
    const today = new Date()
    // Strip time so comparison is date-only
    today.setHours(0, 0, 0, 0)

    const points: SummaryPoint[] = []
    let current = start

    while (current <= end) {
      const monthEnd = endOfMonth(current)
      const isCurrentMonth = monthEnd >= today
      const pointDate = isCurrentMonth ? today : monthEnd

      if (isCurrentMonth) {
        const cs = await this.getCurrent(excludeAccountIds, excludeAssetIds)
        points.push({
          date: toDateString(pointDate),
          net_worth: cs.net_worth,
          deposits: cs.total_deposits,
          unrealized_return: cs.unrealized_return,
          loans: cs.total_loans_personal,
          asset_value: cs.asset_value,
        })
      } else {
        const latestAsOf = getLatestAsOf(allSnapshots, monthEnd)

        let deposits = 0
        let unrealized = 0
        let loans = 0

        for (const [accountId, snap] of latestAsOf) {
          const account = accountMap.get(accountId)
          if (!account) continue
          if (excludeAccSet.has(accountId)) continue
          if (account.account_type === "loan") {
            loans += snap.total * account.ownership_pct
          } else {
            deposits += snap.deposit * account.ownership_pct
            unrealized += snap.unrealized_return * account.ownership_pct
          }
        }

        const assetValue = assets
          .filter((a) => {
            if (excludeAssSet.has(a.id)) return false
            return new Date(a.purchase_date) <= monthEnd
          })
          .reduce(
            (sum, a) => sum + computeEstimatedValue(a, monthEnd) * a.ownership_pct,
            0,
          )

        points.push({
          date: toDateString(monthEnd),
          net_worth: deposits + unrealized + loans + assetValue,
          deposits,
          unrealized_return: unrealized,
          loans,
          asset_value: assetValue,
        })
      }

      current = addOneMonth(current)
    }

    return points
  },
}
