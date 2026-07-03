from datetime import date
from uuid import UUID

from core.domain.models import Asset, AssetType
from core.ports.repositories import AssetRepository


class AssetService:
    def __init__(self, repo: AssetRepository) -> None:
        self.repo = repo

    def list(self, include_inactive: bool = False) -> list[Asset]:
        return self.repo.get_all(include_inactive)

    def get(self, id: UUID) -> Asset:
        asset = self.repo.get_by_id(id)
        if not asset:
            raise ValueError(f"Asset {id} not found")
        return asset

    def create(
        self,
        name: str,
        asset_type: AssetType,
        purchase_price: float,
        purchase_date: date,
        annual_growth_rate: float,
        ownership_pct: float = 1.0,
        notes: str | None = None,
        sold_at: date | None = None,
        sold_for: float | None = None,
    ) -> Asset:
        asset = Asset(
            name=name,
            asset_type=asset_type,
            purchase_price=purchase_price,
            purchase_date=purchase_date,
            annual_growth_rate=annual_growth_rate,
            ownership_pct=ownership_pct,
            notes=notes,
            sold_at=sold_at,
            sold_for=sold_for,
        )
        return self.repo.save(asset)

    def update(self, id: UUID, **kwargs: object) -> Asset:
        asset = self.get(id)
        return self.repo.update(asset.model_copy(update=kwargs))

    def deactivate(self, id: UUID) -> None:
        asset = self.get(id)
        self.repo.update(asset.model_copy(update={"is_active": False}))
