from uuid import UUID

from core.domain.models import Asset
from infra.database import get_connection


class SQLiteAssetRepository:
    def get_all(self, include_inactive: bool = False) -> list[Asset]:
        sql = "SELECT * FROM assets ORDER BY created_at"
        if not include_inactive:
            sql = "SELECT * FROM assets WHERE is_active = 1 ORDER BY created_at"
        with get_connection() as conn:
            rows = conn.execute(sql).fetchall()
        return [Asset.model_validate(dict(row)) for row in rows]

    def get_by_id(self, id: UUID) -> Asset | None:
        with get_connection() as conn:
            row = conn.execute("SELECT * FROM assets WHERE id = ?", [str(id)]).fetchone()
        return Asset.model_validate(dict(row)) if row else None

    def save(self, asset: Asset) -> Asset:
        with get_connection() as conn:
            conn.execute(
                """INSERT INTO assets
                   (id, name, asset_type, purchase_price, purchase_date, annual_growth_rate,
                    ownership_pct, notes, sold_at, sold_for, is_active, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                [
                    str(asset.id),
                    asset.name,
                    asset.asset_type.value,
                    asset.purchase_price,
                    asset.purchase_date.isoformat(),
                    asset.annual_growth_rate,
                    asset.ownership_pct,
                    asset.notes,
                    asset.sold_at.isoformat() if asset.sold_at else None,
                    asset.sold_for,
                    int(asset.is_active),
                    asset.created_at.isoformat(),
                ],
            )
        return asset

    def update(self, asset: Asset) -> Asset:
        with get_connection() as conn:
            conn.execute(
                """UPDATE assets
                   SET name = ?, annual_growth_rate = ?, ownership_pct = ?,
                       notes = ?, sold_at = ?, sold_for = ?, is_active = ?
                   WHERE id = ?""",
                [
                    asset.name,
                    asset.annual_growth_rate,
                    asset.ownership_pct,
                    asset.notes,
                    asset.sold_at.isoformat() if asset.sold_at else None,
                    asset.sold_for,
                    int(asset.is_active),
                    str(asset.id),
                ],
            )
        return asset
