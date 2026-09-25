import { getDb, type StoredAsset } from "../db"
import type { Asset, UpdateAssetInput } from "../types"

export function computeEstimatedValue(asset: StoredAsset, at?: Date): number {
  const reference = at ?? new Date()
  if (asset.sold_at && reference >= new Date(asset.sold_at)) return 0
  const purchaseDate = new Date(asset.purchase_date)
  if (reference < purchaseDate) return asset.purchase_price
  const years =
    (reference.getTime() - purchaseDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  return asset.purchase_price * Math.pow(1 + asset.annual_growth_rate, years)
}

function toAsset(s: StoredAsset): Asset {
  return { ...s, current_estimated_value: computeEstimatedValue(s) }
}

export const assetsRepo = {
  async getAll(includeInactive = false): Promise<Asset[]> {
    const db = await getDb()
    const all = await db.getAll("assets")
    return (includeInactive ? all : all.filter((a) => a.is_active)).map(toAsset)
  },

  async getById(id: string): Promise<Asset | undefined> {
    const db = await getDb()
    const item = await db.get("assets", id)
    return item ? toAsset(item) : undefined
  },

  async save(asset: Asset): Promise<Asset> {
    const db = await getDb()
    const { current_estimated_value: _, ...stored } = asset
    await db.put("assets", stored)
    return toAsset(stored)
  },

  async update(id: string, data: UpdateAssetInput): Promise<Asset> {
    const db = await getDb()
    const existing = await db.get("assets", id)
    if (!existing) throw new Error(`Asset ${id} not found`)
    const updated: StoredAsset = { ...existing, ...data }
    await db.put("assets", updated)
    return toAsset(updated)
  },

  async delete(id: string): Promise<void> {
    const db = await getDb()
    const existing = await db.get("assets", id)
    if (!existing) throw new Error(`Asset ${id} not found`)
    await db.put("assets", { ...existing, is_active: false })
  },
}
