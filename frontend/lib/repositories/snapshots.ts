import { getDb, type StoredSnapshot } from "../db"
import type { Snapshot, UpdateSnapshotInput } from "../types"

function toSnapshot(s: StoredSnapshot): Snapshot {
  return { ...s, total: s.deposit + s.unrealized_return }
}

export const snapshotsRepo = {
  async getAll(): Promise<Snapshot[]> {
    const db = await getDb()
    return (await db.getAll("snapshots")).map(toSnapshot)
  },

  async getForAccount(accountId: string): Promise<Snapshot[]> {
    const db = await getDb()
    const items = await db.getAllFromIndex("snapshots", "by_account", accountId)
    return items.map(toSnapshot).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
  },

  async getLatestForAll(): Promise<Record<string, Snapshot>> {
    const all = await this.getAll()
    const result: Record<string, Snapshot> = {}
    for (const snap of all) {
      const existing = result[snap.account_id]
      if (!existing || snap.recorded_at > existing.recorded_at) {
        result[snap.account_id] = snap
      }
    }
    return result
  },

  async getEarliestDate(): Promise<Date | null> {
    const db = await getDb()
    const all = await db.getAll("snapshots")
    if (all.length === 0) return null
    const earliest = all.reduce(
      (min, s) => (s.recorded_at < min ? s.recorded_at : min),
      all[0].recorded_at,
    )
    return new Date(earliest)
  },

  async save(snapshot: Snapshot): Promise<Snapshot> {
    const db = await getDb()
    const { total: _, ...stored } = snapshot
    await db.put("snapshots", stored)
    return snapshot
  },

  async update(snapshotId: string, data: UpdateSnapshotInput): Promise<Snapshot> {
    const db = await getDb()
    const existing = await db.get("snapshots", snapshotId)
    if (!existing) throw new Error(`Snapshot ${snapshotId} not found`)
    const updated = { ...existing, ...data }
    await db.put("snapshots", updated)
    return toSnapshot(updated)
  },

  async delete(snapshotId: string): Promise<void> {
    const db = await getDb()
    await db.delete("snapshots", snapshotId)
  },
}
