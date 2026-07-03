from datetime import date, datetime
from uuid import uuid4

import pytest

from core.domain.models import Account, AccountType, Asset, AssetType, Snapshot


class TestAccountRepository:
    def test_save_and_retrieve(self, account_repo):
        acc = Account(name="DNB Brukskonto", account_type=AccountType.bank, ownership_pct=0.5, notes="shared")
        account_repo.save(acc)
        fetched = account_repo.get_by_id(acc.id)
        assert fetched is not None
        assert fetched.id == acc.id
        assert fetched.name == "DNB Brukskonto"
        assert fetched.account_type == AccountType.bank
        assert fetched.ownership_pct == pytest.approx(0.5)
        assert fetched.notes == "shared"
        assert fetched.is_active is True

    def test_get_by_id_returns_none_for_unknown(self, account_repo):
        assert account_repo.get_by_id(uuid4()) is None

    def test_get_all_returns_only_active_by_default(self, account_repo):
        account_repo.save(Account(name="Active", account_type=AccountType.bank))
        account_repo.save(Account(name="Inactive", account_type=AccountType.savings, is_active=False))
        results = account_repo.get_all()
        assert len(results) == 1
        assert results[0].name == "Active"

    def test_get_all_include_inactive(self, account_repo):
        account_repo.save(Account(name="A", account_type=AccountType.bank))
        account_repo.save(Account(name="B", account_type=AccountType.bank, is_active=False))
        assert len(account_repo.get_all(include_inactive=True)) == 2

    def test_update_persists_changes(self, account_repo):
        acc = Account(name="Old", account_type=AccountType.bank)
        account_repo.save(acc)
        account_repo.update(acc.model_copy(update={"name": "New", "ownership_pct": 0.5}))
        fetched = account_repo.get_by_id(acc.id)
        assert fetched.name == "New"
        assert fetched.ownership_pct == pytest.approx(0.5)

    def test_soft_delete_via_update(self, account_repo):
        acc = Account(name="Test", account_type=AccountType.bank)
        account_repo.save(acc)
        account_repo.update(acc.model_copy(update={"is_active": False}))
        assert account_repo.get_all() == []
        assert len(account_repo.get_all(include_inactive=True)) == 1


class TestSnapshotRepository:
    def test_save_and_get_for_account(self, account_repo, snapshot_repo):
        acc = Account(name="Test", account_type=AccountType.bank)
        account_repo.save(acc)
        snap = Snapshot(account_id=acc.id, deposit=10_000, unrealized_return=500)
        snapshot_repo.save(snap)
        history = snapshot_repo.get_for_account(acc.id)
        assert len(history) == 1
        assert history[0].deposit == pytest.approx(10_000)
        assert history[0].unrealized_return == pytest.approx(500)
        assert history[0].total == pytest.approx(10_500)

    def test_get_for_account_ordered_by_date(self, account_repo, snapshot_repo):
        acc = Account(name="Test", account_type=AccountType.bank)
        account_repo.save(acc)
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=2_000, recorded_at=datetime(2025, 3, 1)))
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=1_000, recorded_at=datetime(2025, 1, 1)))
        history = snapshot_repo.get_for_account(acc.id)
        assert history[0].deposit == pytest.approx(1_000)
        assert history[1].deposit == pytest.approx(2_000)

    def test_get_latest_for_all_returns_most_recent_per_account(self, account_repo, snapshot_repo):
        acc = Account(name="Test", account_type=AccountType.bank)
        account_repo.save(acc)
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=10_000, recorded_at=datetime(2025, 1, 1)))
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=20_000, recorded_at=datetime(2025, 6, 1)))
        latest = snapshot_repo.get_latest_for_all()
        assert latest[acc.id].deposit == pytest.approx(20_000)

    def test_get_latest_for_all_one_entry_per_account(self, account_repo, snapshot_repo):
        acc1 = Account(name="A", account_type=AccountType.bank)
        acc2 = Account(name="B", account_type=AccountType.savings)
        account_repo.save(acc1)
        account_repo.save(acc2)
        snapshot_repo.save(Snapshot(account_id=acc1.id, deposit=1_000))
        snapshot_repo.save(Snapshot(account_id=acc1.id, deposit=1_500))
        snapshot_repo.save(Snapshot(account_id=acc2.id, deposit=2_000))
        latest = snapshot_repo.get_latest_for_all()
        assert len(latest) == 2

    def test_get_latest_as_of_respects_cutoff(self, account_repo, snapshot_repo):
        acc = Account(name="Test", account_type=AccountType.bank)
        account_repo.save(acc)
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=5_000, recorded_at=datetime(2025, 1, 15)))
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=9_000, recorded_at=datetime(2025, 3, 15)))
        result = snapshot_repo.get_latest_as_of(date(2025, 1, 31))
        assert len(result) == 1
        assert result[0].deposit == pytest.approx(5_000)

    def test_get_latest_as_of_excludes_snapshots_after_cutoff(self, account_repo, snapshot_repo):
        acc = Account(name="Test", account_type=AccountType.bank)
        account_repo.save(acc)
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=5_000, recorded_at=datetime(2025, 6, 1)))
        assert snapshot_repo.get_latest_as_of(date(2025, 1, 31)) == []

    def test_get_latest_as_of_includes_snapshot_on_cutoff_day(self, account_repo, snapshot_repo):
        acc = Account(name="Test", account_type=AccountType.bank)
        account_repo.save(acc)
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=7_000, recorded_at=datetime(2025, 1, 31, 12, 0)))
        result = snapshot_repo.get_latest_as_of(date(2025, 1, 31))
        assert len(result) == 1
        assert result[0].deposit == pytest.approx(7_000)

    def test_get_earliest_date_returns_first_snapshot_date(self, account_repo, snapshot_repo):
        acc = Account(name="Test", account_type=AccountType.bank)
        account_repo.save(acc)
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=1_000, recorded_at=datetime(2025, 3, 15)))
        snapshot_repo.save(Snapshot(account_id=acc.id, deposit=2_000, recorded_at=datetime(2025, 1, 15)))
        assert snapshot_repo.get_earliest_date() == date(2025, 1, 15)

    def test_get_earliest_date_returns_none_when_empty(self, snapshot_repo):
        assert snapshot_repo.get_earliest_date() is None


class TestAssetRepository:
    def _house(self, **kwargs) -> Asset:
        defaults = dict(
            name="House",
            asset_type=AssetType.real_estate,
            purchase_price=4_300_000,
            purchase_date=date(2024, 7, 1),
            annual_growth_rate=0.06,
            ownership_pct=0.5,
        )
        defaults.update(kwargs)
        return Asset(**defaults)

    def test_save_and_retrieve(self, asset_repo):
        asset = self._house()
        asset_repo.save(asset)
        fetched = asset_repo.get_by_id(asset.id)
        assert fetched is not None
        assert fetched.name == "House"
        assert fetched.purchase_date == date(2024, 7, 1)
        assert fetched.annual_growth_rate == pytest.approx(0.06)
        assert fetched.ownership_pct == pytest.approx(0.5)
        assert fetched.sold_at is None
        assert fetched.sold_for is None

    def test_get_by_id_returns_none_for_unknown(self, asset_repo):
        assert asset_repo.get_by_id(uuid4()) is None

    def test_update_sold_fields(self, asset_repo):
        asset = self._house()
        asset_repo.save(asset)
        asset_repo.update(asset.model_copy(update={"sold_at": date(2026, 1, 1), "sold_for": 5_000_000.0}))
        fetched = asset_repo.get_by_id(asset.id)
        assert fetched.sold_at == date(2026, 1, 1)
        assert fetched.sold_for == pytest.approx(5_000_000)

    def test_update_growth_rate(self, asset_repo):
        asset = self._house()
        asset_repo.save(asset)
        asset_repo.update(asset.model_copy(update={"annual_growth_rate": 0.08}))
        fetched = asset_repo.get_by_id(asset.id)
        assert fetched.annual_growth_rate == pytest.approx(0.08)

    def test_get_all_filters_inactive(self, asset_repo):
        asset_repo.save(self._house(name="Active"))
        asset_repo.save(self._house(name="Inactive", is_active=False))
        assert len(asset_repo.get_all()) == 1
        assert len(asset_repo.get_all(include_inactive=True)) == 2
