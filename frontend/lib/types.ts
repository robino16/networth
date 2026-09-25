export type AccountType = "bank" | "savings" | "loan" | "funds" | "stocks" | "crypto" | "pension" | "other"
export type AssetType = "real_estate" | "vehicle" | "other"

export interface Account {
  id: string
  name: string
  account_type: AccountType
  ownership_pct: number
  currency: string
  notes: string | null
  is_active: boolean
  created_at: string
  sort_order?: number
}

export interface Snapshot {
  id: string
  account_id: string
  recorded_at: string
  deposit: number
  unrealized_return: number
  total: number
}

export interface AccountWithSnapshot {
  account: Account
  latest_snapshot: Snapshot | null
}

export interface Asset {
  id: string
  name: string
  asset_type: AssetType
  purchase_price: number
  purchase_date: string
  annual_growth_rate: number
  ownership_pct: number
  notes: string | null
  sold_at: string | null
  sold_for: number | null
  is_active: boolean
  created_at: string
  current_estimated_value: number
}

export interface Preset {
  id: string
  name: string
  excludedAccountIds: string[]
  excludedAssetIds: string[]
}

export interface CurrentSummary {
  net_worth: number
  total_loans: number
  total_loans_personal: number
  total_deposits: number
  unrealized_return: number
  asset_value: number
}

export interface SummaryPoint {
  date: string
  net_worth: number
  deposits: number
  unrealized_return: number
  loans: number
  asset_value: number
}

export interface CreateAccountInput {
  name: string
  account_type: AccountType
  ownership_pct: number
  notes?: string | null
}

export interface UpdateAccountInput {
  name?: string
  ownership_pct?: number
  notes?: string | null
  is_active?: boolean
}

export interface CreateSnapshotInput {
  deposit: number
  unrealized_return?: number
  recorded_at?: string | null
}

export interface UpdateSnapshotInput {
  deposit: number
  unrealized_return: number
  recorded_at: string
}

export interface CreateAssetInput {
  name: string
  asset_type: AssetType
  purchase_price: number
  purchase_date: string
  annual_growth_rate: number
  ownership_pct?: number
  notes?: string | null
  sold_at?: string | null
  sold_for?: number | null
}

export interface UpdateAssetInput {
  name?: string
  annual_growth_rate?: number
  ownership_pct?: number
  notes?: string | null
  sold_at?: string | null
  sold_for?: number | null
  is_active?: boolean
}
