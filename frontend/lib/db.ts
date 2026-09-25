import { openDB, type DBSchema, type IDBPDatabase } from "idb"
import type { Account, Asset, Snapshot } from "./types"

export type StoredSnapshot = Omit<Snapshot, "total">
export type StoredAsset = Omit<Asset, "current_estimated_value">

interface NetworthSchema extends DBSchema {
  accounts: { key: string; value: Account }
  snapshots: {
    key: string
    value: StoredSnapshot
    indexes: { by_account: string }
  }
  assets: { key: string; value: StoredAsset }
}

let _db: Promise<IDBPDatabase<NetworthSchema>> | null = null

export function getDb(): Promise<IDBPDatabase<NetworthSchema>> {
  if (!_db) {
    _db = openDB<NetworthSchema>("networth", 1, {
      upgrade(db) {
        db.createObjectStore("accounts", { keyPath: "id" })
        const snapshots = db.createObjectStore("snapshots", { keyPath: "id" })
        snapshots.createIndex("by_account", "account_id")
        db.createObjectStore("assets", { keyPath: "id" })
      },
    })
  }
  return _db
}
