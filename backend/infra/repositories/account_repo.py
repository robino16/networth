from uuid import UUID

from core.domain.models import Account
from infra.database import get_connection


class SQLiteAccountRepository:
    def get_all(self, include_inactive: bool = False) -> list[Account]:
        sql = "SELECT * FROM accounts ORDER BY created_at"
        if not include_inactive:
            sql = "SELECT * FROM accounts WHERE is_active = 1 ORDER BY created_at"
        with get_connection() as conn:
            rows = conn.execute(sql).fetchall()
        return [Account.model_validate(dict(row)) for row in rows]

    def get_by_id(self, id: UUID) -> Account | None:
        with get_connection() as conn:
            row = conn.execute("SELECT * FROM accounts WHERE id = ?", [str(id)]).fetchone()
        return Account.model_validate(dict(row)) if row else None

    def save(self, account: Account) -> Account:
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO accounts
                   (id, name, account_type, ownership_pct, currency, notes, is_active, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    str(account.id),
                    account.name,
                    account.account_type.value,
                    account.ownership_pct,
                    account.currency,
                    account.notes,
                    int(account.is_active),
                    account.created_at.isoformat(),
                ],
            )
        return account

    def update(self, account: Account) -> Account:
        with get_connection() as conn:
            conn.execute(
                """UPDATE accounts
                   SET name = ?, account_type = ?, ownership_pct = ?, notes = ?, is_active = ?
                   WHERE id = ?""",
                [
                    account.name,
                    account.account_type.value,
                    account.ownership_pct,
                    account.notes,
                    int(account.is_active),
                    str(account.id),
                ],
            )
        return account
