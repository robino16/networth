from datetime import date, timedelta
from uuid import UUID

from core.domain.models import Snapshot
from infra.database import get_connection


class SQLiteSnapshotRepository:
    def get_for_account(self, account_id: UUID) -> list[Snapshot]:
        with get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM snapshots WHERE account_id = ? ORDER BY recorded_at",
                [str(account_id)],
            ).fetchall()
        return [Snapshot.model_validate(dict(row)) for row in rows]

    def get_latest_for_all(self) -> dict[UUID, Snapshot]:
        with get_connection() as conn:
            rows = conn.execute("""
                SELECT s.* FROM snapshots s
                INNER JOIN (
                    SELECT account_id, MAX(recorded_at) AS max_at
                    FROM snapshots
                    GROUP BY account_id
                ) latest ON s.account_id = latest.account_id
                         AND s.recorded_at = latest.max_at
            """).fetchall()
        return {UUID(row["account_id"]): Snapshot.model_validate(dict(row)) for row in rows}

    def get_latest_as_of(self, as_of: date) -> list[Snapshot]:
        # Include everything up to and including the given date
        cutoff = f"{(as_of + timedelta(days=1)).isoformat()}T00:00:00"
        with get_connection() as conn:
            rows = conn.execute("""
                SELECT * FROM (
                    SELECT *, ROW_NUMBER() OVER (
                        PARTITION BY account_id
                        ORDER BY recorded_at DESC,
                                 (deposit + unrealized_return) DESC,
                                 rowid DESC
                    ) AS rn
                    FROM snapshots
                    WHERE recorded_at < ?
                ) WHERE rn = 1
            """, [cutoff]).fetchall()
        return [Snapshot.model_validate(dict(row)) for row in rows]

    def get_earliest_date(self) -> date | None:
        with get_connection() as conn:
            row = conn.execute("SELECT MIN(recorded_at) AS earliest FROM snapshots").fetchone()
        if row and row["earliest"]:
            return date.fromisoformat(row["earliest"][:10])
        return None

    def update(self, snapshot: Snapshot) -> Snapshot:
        with get_connection() as conn:
            conn.execute(
                """UPDATE snapshots
                   SET deposit = ?, unrealized_return = ?, recorded_at = ?
                   WHERE id = ? AND account_id = ?""",
                [
                    snapshot.deposit,
                    snapshot.unrealized_return,
                    snapshot.recorded_at.isoformat(),
                    str(snapshot.id),
                    str(snapshot.account_id),
                ],
            )
        return snapshot

    def delete(self, account_id: UUID, snapshot_id: UUID) -> None:
        with get_connection() as conn:
            conn.execute(
                "DELETE FROM snapshots WHERE id = ? AND account_id = ?",
                [str(snapshot_id), str(account_id)],
            )

    def save(self, snapshot: Snapshot) -> Snapshot:
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO snapshots
                   (id, account_id, recorded_at, deposit, unrealized_return)
                   VALUES (?, ?, ?, ?, ?)""",
                [
                    str(snapshot.id),
                    str(snapshot.account_id),
                    snapshot.recorded_at.isoformat(),
                    snapshot.deposit,
                    snapshot.unrealized_return,
                ],
            )
        return snapshot
