import { getDb } from "../db"
import type { Account, UpdateAccountInput } from "../types"

export const accountsRepo = {
  async getAll(includeInactive = false): Promise<Account[]> {
    const db = await getDb()
    const all = await db.getAll("accounts")
    const filtered = includeInactive ? all : all.filter((a) => a.is_active)
    return filtered.sort((a, b) => {
      const oa = a.sort_order ?? Number.MAX_SAFE_INTEGER
      const ob = b.sort_order ?? Number.MAX_SAFE_INTEGER
      if (oa !== ob) return oa - ob
      return a.created_at.localeCompare(b.created_at)
    })
  },

  async getById(id: string): Promise<Account | undefined> {
    const db = await getDb()
    return db.get("accounts", id)
  },

  async save(account: Account): Promise<Account> {
    const db = await getDb()
    await db.put("accounts", account)
    return account
  },

  async update(id: string, data: UpdateAccountInput): Promise<Account> {
    const db = await getDb()
    const existing = await db.get("accounts", id)
    if (!existing) throw new Error(`Account ${id} not found`)
    const updated = { ...existing, ...data }
    await db.put("accounts", updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const db = await getDb()
    const existing = await db.get("accounts", id)
    if (!existing) throw new Error(`Account ${id} not found`)
    await db.put("accounts", { ...existing, is_active: false })
  },

  async reorder(orderedIds: string[]): Promise<void> {
    const db = await getDb()
    await Promise.all(
      orderedIds.map(async (id, index) => {
        const account = await db.get("accounts", id)
        if (account) await db.put("accounts", { ...account, sort_order: index })
      }),
    )
  },
}
