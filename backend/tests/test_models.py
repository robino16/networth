from datetime import date
from uuid import uuid4

import pytest

from core.domain.models import Asset, AssetType, Snapshot


class TestSnapshotTotal:
    def test_sum_of_deposit_and_unrealized(self):
        s = Snapshot(account_id=uuid4(), deposit=50_000, unrealized_return=5_000)
        assert s.total == 55_000

    def test_zero_unrealized(self):
        s = Snapshot(account_id=uuid4(), deposit=100_000)
        assert s.total == 100_000

    def test_negative_unrealized_loss(self):
        s = Snapshot(account_id=uuid4(), deposit=100_000, unrealized_return=-15_000)
        assert s.total == 85_000

    def test_negative_deposit_loan(self):
        s = Snapshot(account_id=uuid4(), deposit=-500_000)
        assert s.total == -500_000


class TestAssetEstimatedValue:
    def _make(self, **kwargs) -> Asset:
        defaults = dict(
            name="House",
            asset_type=AssetType.real_estate,
            purchase_price=1_000_000,
            purchase_date=date(2020, 1, 1),
            annual_growth_rate=0.06,
        )
        defaults.update(kwargs)
        return Asset(**defaults)

    def test_at_purchase_date_equals_purchase_price(self):
        asset = self._make()
        assert asset.estimated_value(at=date(2020, 1, 1)) == pytest.approx(1_000_000, rel=1e-3)

    def test_before_purchase_date_returns_purchase_price(self):
        asset = self._make()
        assert asset.estimated_value(at=date(2019, 6, 1)) == 1_000_000

    def test_positive_growth_after_one_year(self):
        asset = self._make()
        value = asset.estimated_value(at=date(2021, 1, 1))
        assert value == pytest.approx(1_000_000 * 1.06, rel=0.01)

    def test_positive_growth_after_two_years(self):
        asset = self._make()
        value = asset.estimated_value(at=date(2022, 1, 1))
        assert value == pytest.approx(1_000_000 * 1.06 ** 2, rel=0.01)

    def test_vehicle_depreciation(self):
        car = self._make(
            name="Car",
            asset_type=AssetType.vehicle,
            purchase_price=130_000,
            purchase_date=date(2022, 1, 1),
            annual_growth_rate=-0.15,
        )
        value = car.estimated_value(at=date(2026, 1, 1))
        assert value == pytest.approx(130_000 * (0.85 ** 4), rel=0.01)

    def test_sold_asset_still_uses_growth_formula_before_sale_date(self):
        # During ownership the trajectory should follow the growth rate, not jump to sold_for
        asset = self._make(sold_at=date(2023, 6, 1), sold_for=1_500_000, annual_growth_rate=0.06)
        mid_ownership = date(2022, 1, 1)
        expected = 1_000_000 * (1.06 ** 2)
        assert asset.estimated_value(at=mid_ownership) == pytest.approx(expected, rel=0.01)

    def test_sold_asset_returns_zero_on_and_after_sale_date(self):
        # After the sale the asset no longer contributes to net worth
        asset = self._make(sold_at=date(2023, 6, 1), sold_for=1_500_000)
        assert asset.estimated_value(at=date(2023, 6, 1)) == 0.0
        assert asset.estimated_value(at=date(2025, 1, 1)) == 0.0

    def test_sold_asset_current_value_is_zero_after_sale(self):
        asset = self._make(sold_at=date(2020, 6, 1), sold_for=1_100_000)
        assert asset.current_estimated_value == 0.0

    def test_zero_growth_rate_stays_flat(self):
        asset = self._make(annual_growth_rate=0.0)
        assert asset.estimated_value(at=date(2025, 1, 1)) == pytest.approx(1_000_000)

    def test_current_estimated_value_computed_field_matches_method(self):
        asset = self._make()
        assert asset.current_estimated_value == asset.estimated_value()
