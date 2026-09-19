"""
Creates backend/networth.db with realistic mock data for screenshots.
Safe to re-run — deletes and recreates the DB each time.
Does NOT touch networth-original.db.
"""

import sqlite3
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "networth.db"


def new_id() -> str:
    return str(uuid.uuid4())


def dt(d: date) -> str:
    return datetime(d.year, d.month, d.day, 12, 0, 0).isoformat()


def main() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript("""
        CREATE TABLE accounts (
            id            TEXT PRIMARY KEY,
            name          TEXT NOT NULL,
            account_type  TEXT NOT NULL,
            ownership_pct REAL NOT NULL DEFAULT 1.0,
            currency      TEXT NOT NULL DEFAULT 'NOK',
            notes         TEXT,
            is_active     INTEGER NOT NULL DEFAULT 1,
            created_at    TEXT NOT NULL
        );
        CREATE TABLE snapshots (
            id                TEXT PRIMARY KEY,
            account_id        TEXT NOT NULL REFERENCES accounts(id),
            recorded_at       TEXT NOT NULL,
            deposit           REAL NOT NULL,
            unrealized_return REAL NOT NULL DEFAULT 0.0
        );
        CREATE TABLE assets (
            id                 TEXT PRIMARY KEY,
            name               TEXT NOT NULL,
            asset_type         TEXT NOT NULL,
            purchase_price     REAL NOT NULL,
            purchase_date      TEXT NOT NULL,
            annual_growth_rate REAL NOT NULL,
            ownership_pct      REAL NOT NULL DEFAULT 1.0,
            notes              TEXT,
            sold_at            TEXT,
            sold_for           REAL,
            is_active          INTEGER NOT NULL DEFAULT 1,
            created_at         TEXT NOT NULL
        );
    """)

    today = date.today()
    created = dt(today - timedelta(days=400))

    # --- Accounts ---
    accounts = [
        # (id, name, type, ownership_pct, notes)
        (new_id(), "DNB Brukskonto",       "bank",    1.0, None),
        (new_id(), "DNB BSU",              "savings", 1.0, "Boligsparing for ungdom"),
        (new_id(), "Nordnet Aksjesparekonto", "stocks", 1.0, None),
        (new_id(), "Nordnet Fondskonto",   "funds",   1.0, None),
        (new_id(), "Kron",                 "funds",   1.0, "Månedlig sparing"),
        (new_id(), "Coinbase BTC",         "crypto",  1.0, None),
        (new_id(), "Statens Pensjonskasse","pension",  1.0, None),
        (new_id(), "Studielån",            "loan",    1.0, "Lånekassen"),
        (new_id(), "Billån",               "loan",    1.0, "Santander Consumer Bank"),
    ]

    conn.executemany(
        "INSERT INTO accounts VALUES (?,?,?,?,?,?,1,?)",
        [(a[0], a[1], a[2], a[3], "NOK", a[4], created) for a in accounts],
    )

    # --- Snapshots: 13 monthly entries per account ---
    # Each account has a base value and a monthly delta so charts trend nicely.
    # (account index, start_deposit, start_return, monthly_deposit_delta, monthly_return_delta)
    # Loans are negative deposit, 0 return.
    trajectories = [
        # bank — steady, small fluctuations
        (0,  42_000,      0,    1_200,       0),
        # BSU — grows steadily
        (1, 180_000,      0,    2_750,       0),
        # stocks — grows with return component
        (2,  60_000,  8_500,    1_000,   1_200),
        # funds — grows with return
        (3,  95_000, 22_000,    2_000,   1_800),
        # kron — small steady fund
        (4,  18_000,  2_100,      500,     280),
        # crypto — volatile, higher return swings
        (5,  15_000,  4_200,        0,   1_100),
        # pension — slow steady growth
        (6, 210_000,      0,    3_500,       0),
        # studielån — loan, slowly being paid down (negative)
        (7, -320_000,     0,    4_000,       0),
        # billån — loan, paid down faster (negative)
        (8,  -95_000,     0,    2_200,       0),
    ]

    snapshots = []
    for acc_idx, start_dep, start_ret, d_dep, d_ret in trajectories:
        acc_id = accounts[acc_idx][0]
        for month_offset in range(12, -1, -1):  # oldest first
            snap_date = date(today.year, today.month, 1) - timedelta(days=30 * month_offset)
            deposit = start_dep + d_dep * (12 - month_offset)
            ret     = start_ret + d_ret * (12 - month_offset)
            # Loans: deposit is negative, no return — reduce magnitude each month
            if start_dep < 0:
                deposit = start_dep + abs(d_dep) * (12 - month_offset)
                ret = 0.0
            snapshots.append((new_id(), acc_id, dt(snap_date), deposit, ret))

    conn.executemany(
        "INSERT INTO snapshots VALUES (?,?,?,?,?)",
        snapshots,
    )

    # --- Asset: shared apartment ---
    asset_id = new_id()
    purchase = date(2021, 6, 15)
    conn.execute(
        "INSERT INTO assets VALUES (?,?,?,?,?,?,?,?,?,?,1,?)",
        (
            asset_id,
            "Leilighet Oslo",
            "real_estate",
            3_200_000,        # purchase price
            purchase.isoformat(),
            0.055,            # 5.5 % annual growth
            0.5,              # 50 % ownership
            "Delt med partner",
            None,             # not sold
            None,
            created,
        ),
    )

    conn.commit()
    conn.close()

    print(f"Mock database written to {DB_PATH}")
    print(f"  {len(accounts)} accounts")
    print(f"  {len(snapshots)} snapshots ({len(trajectories)} accounts × 13 months)")
    print("  1 asset (real estate)")


if __name__ == "__main__":
    main()
