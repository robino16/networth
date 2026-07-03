import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "networth.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS accounts (
                id           TEXT PRIMARY KEY,
                name         TEXT NOT NULL,
                account_type TEXT NOT NULL,
                ownership_pct REAL NOT NULL DEFAULT 1.0,
                currency     TEXT NOT NULL DEFAULT 'NOK',
                notes        TEXT,
                is_active    INTEGER NOT NULL DEFAULT 1,
                created_at   TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS snapshots (
                id               TEXT PRIMARY KEY,
                account_id       TEXT NOT NULL REFERENCES accounts(id),
                recorded_at      TEXT NOT NULL,
                deposit          REAL NOT NULL,
                unrealized_return REAL NOT NULL DEFAULT 0.0
            );

            CREATE TABLE IF NOT EXISTS assets (
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
