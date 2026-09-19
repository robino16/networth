"""
Exports networth-original.db to a JSON file compatible with the
frontend's Import button (same format as exportImport.ts).

Usage:
    uv run python migrate_to_json.py
    uv run python migrate_to_json.py --db networth.db --out export.json
"""

import argparse
import json
import math
import sqlite3
from datetime import date, datetime
from pathlib import Path


def estimated_value(purchase_price: float, purchase_date: str, annual_growth_rate: float,
                    sold_at: str | None) -> float:
    reference = date.today()
    if sold_at and reference >= date.fromisoformat(sold_at):
        return 0.0
    pd = date.fromisoformat(purchase_date)
    if reference < pd:
        return purchase_price
    years = (reference - pd).days / 365.25
    return purchase_price * math.pow(1 + annual_growth_rate, years)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default="networth-original.db")
    parser.add_argument("--out", default="networth-export.json")
    args = parser.parse_args()

    db_path = Path(__file__).parent / args.db
    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    accounts = [dict(row) for row in conn.execute("SELECT * FROM accounts")]
    for a in accounts:
        a["is_active"] = bool(a["is_active"])

    raw_snapshots = [dict(row) for row in conn.execute("SELECT * FROM snapshots")]
    snapshots = [
        {**s, "total": s["deposit"] + s["unrealized_return"]}
        for s in raw_snapshots
    ]

    raw_assets = [dict(row) for row in conn.execute("SELECT * FROM assets")]
    assets = [
        {
            **a,
            "is_active": bool(a["is_active"]),
            "current_estimated_value": estimated_value(
                a["purchase_price"], a["purchase_date"],
                a["annual_growth_rate"], a["sold_at"],
            ),
        }
        for a in raw_assets
    ]

    conn.close()

    payload = {
        "version": 1,
        "exported_at": datetime.now().isoformat(),
        "accounts": accounts,
        "snapshots": snapshots,
        "assets": assets,
    }

    out_path = Path(__file__).parent / args.out
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Exported {len(accounts)} accounts, {len(snapshots)} snapshots, {len(assets)} assets")
    print(f"Saved to: {out_path}")
    print(f"\nNow open the app, go to Accounts > Import, and select {args.out}")


if __name__ == "__main__":
    main()
