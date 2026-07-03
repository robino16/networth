from datetime import date, datetime
from uuid import uuid4

import pytest

from core.domain.models import AccountType, AssetType


class TestAccountService:
    def test_create_returns_account_with_correct_fields(self, account_svc):
        acc = account_svc.create("Firi Crypto", AccountType.crypto, ownership_pct=1.0)
        assert acc.name == "Firi Crypto"
        assert acc.account_type == AccountType.crypto
        assert acc.is_active is True
        assert acc.currency == "NOK"

    def test_list_returns_only_active(self, account_svc):
        account_svc.create("Active", AccountType.bank)
        to_remove = account_svc.create("Closed", AccountType.savings)
        account_svc.deactivate(to_remove.id)
        results = account_svc.list()
        assert len(results) == 1
        assert results[0].name == "Active"

    def test_list_include_inactive(self, account_svc):
        account_svc.create("A", AccountType.bank)
        b = account_svc.create("B", AccountType.bank)
        account_svc.deactivate(b.id)
        assert len(account_svc.list(include_inactive=True)) == 2

    def test_get_raises_for_unknown_id(self, account_svc):
        with pytest.raises(ValueError):
            account_svc.get(uuid4())

    def test_get_returns_correct_account(self, account_svc):
        acc = account_svc.create("Test", AccountType.loan)
        fetched = account_svc.get(acc.id)
        assert fetched.id == acc.id

    def test_update_name(self, account_svc):
        acc = account_svc.create("Old", AccountType.bank)
        updated = account_svc.update(acc.id, name="New")
        assert updated.name == "New"
        assert account_svc.get(acc.id).name == "New"

    def test_update_ownership_pct(self, account_svc):
        acc = account_svc.create("Boliglån", AccountType.loan)
        account_svc.update(acc.id, ownership_pct=0.5)
        assert account_svc.get(acc.id).ownership_pct == pytest.approx(0.5)

    def test_deactivate_raises_for_unknown(self, account_svc):
        with pytest.raises(ValueError):
            account_svc.deactivate(uuid4())


class TestSnapshotService:
    def test_record_creates_snapshot(self, account_svc, snapshot_svc):
        acc = account_svc.create("Bank", AccountType.bank)
        snap = snapshot_svc.record(acc.id, deposit=50_000, unrealized_return=0)
        assert snap.account_id == acc.id
        assert snap.deposit == pytest.approx(50_000)
        assert snap.total == pytest.approx(50_000)

    def test_record_with_unrealized_return(self, account_svc, snapshot_svc):
        acc = account_svc.create("Stocks", AccountType.stocks)
        snap = snapshot_svc.record(acc.id, deposit=30_000, unrealized_return=5_000)
        assert snap.total == pytest.approx(35_000)

    def test_record_raises_for_unknown_account(self, snapshot_svc):
        with pytest.raises(ValueError):
            snapshot_svc.record(uuid4(), deposit=1_000)

    def test_record_with_explicit_timestamp(self, account_svc, snapshot_svc):
        acc = account_svc.create("Bank", AccountType.bank)
        ts = datetime(2025, 1, 15, 9, 0)
        snap = snapshot_svc.record(acc.id, deposit=10_000, recorded_at=ts)
        assert snap.recorded_at == ts

    def test_get_history_returns_all_snapshots(self, account_svc, snapshot_svc):
        acc = account_svc.create("Bank", AccountType.bank)
        snapshot_svc.record(acc.id, deposit=10_000, recorded_at=datetime(2025, 1, 1))
        snapshot_svc.record(acc.id, deposit=11_000, recorded_at=datetime(2025, 2, 1))
        snapshot_svc.record(acc.id, deposit=12_000, recorded_at=datetime(2025, 3, 1))
        history = snapshot_svc.get_history(acc.id)
        assert len(history) == 3

    def test_get_history_raises_for_unknown_account(self, snapshot_svc):
        with pytest.raises(ValueError):
            snapshot_svc.get_history(uuid4())

    def test_get_latest_for_all(self, account_svc, snapshot_svc):
        acc1 = account_svc.create("A", AccountType.bank)
        acc2 = account_svc.create("B", AccountType.savings)
        snapshot_svc.record(acc1.id, deposit=10_000, recorded_at=datetime(2025, 1, 1))
        snapshot_svc.record(acc1.id, deposit=20_000, recorded_at=datetime(2025, 6, 1))
        snapshot_svc.record(acc2.id, deposit=5_000)
        latest = snapshot_svc.get_latest_for_all()
        assert latest[acc1.id].deposit == pytest.approx(20_000)
        assert latest[acc2.id].deposit == pytest.approx(5_000)


class TestAssetService:
    def test_create_returns_asset(self, asset_svc):
        asset = asset_svc.create("Bolig", AssetType.real_estate, 4_300_000, date(2024, 7, 1), 0.06, 0.5)
        assert asset.name == "Bolig"
        assert asset.purchase_price == pytest.approx(4_300_000)
        assert asset.ownership_pct == pytest.approx(0.5)
        assert asset.annual_growth_rate == pytest.approx(0.06)

    def test_get_raises_for_unknown(self, asset_svc):
        with pytest.raises(ValueError):
            asset_svc.get(uuid4())

    def test_update_growth_rate(self, asset_svc):
        asset = asset_svc.create("House", AssetType.real_estate, 1_000_000, date(2022, 1, 1), 0.06)
        asset_svc.update(asset.id, annual_growth_rate=0.08)
        assert asset_svc.get(asset.id).annual_growth_rate == pytest.approx(0.08)

    def test_update_marks_sold(self, asset_svc):
        asset = asset_svc.create("Car", AssetType.vehicle, 130_000, date(2022, 1, 1), -0.15)
        asset_svc.update(asset.id, sold_at=date(2026, 1, 1), sold_for=68_000.0)
        fetched = asset_svc.get(asset.id)
        assert fetched.sold_at == date(2026, 1, 1)
        assert fetched.sold_for == pytest.approx(68_000)

    def test_deactivate_removes_from_list(self, asset_svc):
        asset = asset_svc.create("House", AssetType.real_estate, 1_000_000, date(2022, 1, 1), 0.06)
        asset_svc.deactivate(asset.id)
        assert asset_svc.list() == []

    def test_list_include_inactive(self, asset_svc):
        asset = asset_svc.create("House", AssetType.real_estate, 1_000_000, date(2022, 1, 1), 0.06)
        asset_svc.deactivate(asset.id)
        assert len(asset_svc.list(include_inactive=True)) == 1


class TestSummaryService:
    def test_get_current_with_no_data_returns_zeros(self, summary_svc):
        s = summary_svc.get_current()
        assert s.net_worth == 0
        assert s.total_loans == 0
        assert s.total_deposits == 0
        assert s.unrealized_return == 0
        assert s.asset_value == 0

    def test_get_current_bank_account_deposit(self, account_svc, snapshot_svc, summary_svc):
        acc = account_svc.create("Bank", AccountType.bank)
        snapshot_svc.record(acc.id, deposit=100_000)
        s = summary_svc.get_current()
        assert s.total_deposits == pytest.approx(100_000)
        assert s.net_worth == pytest.approx(100_000)

    def test_get_current_includes_unrealized_return_in_net_worth(self, account_svc, snapshot_svc, summary_svc):
        acc = account_svc.create("Stocks", AccountType.stocks)
        snapshot_svc.record(acc.id, deposit=50_000, unrealized_return=10_000)
        s = summary_svc.get_current()
        assert s.total_deposits == pytest.approx(50_000)
        assert s.unrealized_return == pytest.approx(10_000)
        assert s.net_worth == pytest.approx(60_000)

    def test_get_current_loan_subtracts_from_net_worth(self, account_svc, snapshot_svc, summary_svc):
        acc = account_svc.create("Studielån", AccountType.loan)
        snapshot_svc.record(acc.id, deposit=-500_000)
        s = summary_svc.get_current()
        assert s.total_loans == pytest.approx(-500_000)
        assert s.total_loans_personal == pytest.approx(-500_000)
        assert s.net_worth == pytest.approx(-500_000)

    def test_get_current_shared_loan_splits_personal(self, account_svc, snapshot_svc, summary_svc):
        acc = account_svc.create("Boliglån", AccountType.loan, ownership_pct=0.5)
        snapshot_svc.record(acc.id, deposit=-2_800_000)
        s = summary_svc.get_current()
        assert s.total_loans == pytest.approx(-2_800_000)
        assert s.total_loans_personal == pytest.approx(-1_400_000)
        assert s.net_worth == pytest.approx(-1_400_000)

    def test_get_current_shared_asset_uses_ownership_pct(self, asset_svc, summary_svc):
        asset_svc.create("House", AssetType.real_estate, 1_000_000, date(2020, 1, 1), 0.0, ownership_pct=0.5)
        s = summary_svc.get_current()
        assert s.asset_value == pytest.approx(500_000)
        assert s.net_worth == pytest.approx(500_000)

    def test_get_current_account_without_snapshot_is_ignored(self, account_svc, summary_svc):
        account_svc.create("Empty Account", AccountType.bank)
        s = summary_svc.get_current()
        assert s.net_worth == 0

    def test_get_current_combines_accounts_and_assets(self, account_svc, snapshot_svc, asset_svc, summary_svc):
        bank = account_svc.create("Bank", AccountType.bank)
        snapshot_svc.record(bank.id, deposit=100_000)
        asset_svc.create("House", AssetType.real_estate, 500_000, date(2020, 1, 1), 0.0)
        s = summary_svc.get_current()
        assert s.net_worth == pytest.approx(600_000)

    def test_get_history_empty_when_no_snapshots(self, summary_svc):
        assert summary_svc.get_history() == []

    def test_get_history_returns_one_point_per_month(self, account_svc, snapshot_svc, summary_svc):
        acc = account_svc.create("Bank", AccountType.bank)
        snapshot_svc.record(acc.id, deposit=100_000, recorded_at=datetime(2025, 1, 15))
        points = summary_svc.get_history(from_date=date(2025, 1, 1), to_date=date(2025, 3, 31))
        assert len(points) == 3

    def test_get_history_carries_forward_last_snapshot(self, account_svc, snapshot_svc, summary_svc):
        acc = account_svc.create("Bank", AccountType.bank)
        # Only snapshot in January — should still appear in February and March
        snapshot_svc.record(acc.id, deposit=100_000, recorded_at=datetime(2025, 1, 15))
        points = summary_svc.get_history(from_date=date(2025, 1, 1), to_date=date(2025, 3, 31))
        assert all(p.deposits == pytest.approx(100_000) for p in points)

    def test_get_history_asset_value_grows_over_time(self, account_svc, snapshot_svc, asset_svc, summary_svc):
        # Need a snapshot so get_earliest_date is not None
        acc = account_svc.create("Bank", AccountType.bank)
        snapshot_svc.record(acc.id, deposit=0, recorded_at=datetime(2020, 1, 1))
        asset_svc.create("House", AssetType.real_estate, 1_000_000, date(2020, 1, 1), 0.06)
        points = summary_svc.get_history(from_date=date(2020, 1, 1), to_date=date(2022, 1, 1))
        assert points[-1].asset_value > points[0].asset_value

    def test_get_history_loan_contributes_negatively(self, account_svc, snapshot_svc, summary_svc):
        acc = account_svc.create("Loan", AccountType.loan)
        snapshot_svc.record(acc.id, deposit=-500_000, recorded_at=datetime(2025, 1, 15))
        points = summary_svc.get_history(from_date=date(2025, 1, 1), to_date=date(2025, 1, 31))
        assert points[0].loans < 0
        assert points[0].net_worth < 0

    def test_get_history_future_to_date_defaults_to_today(self, account_svc, snapshot_svc, summary_svc):
        acc = account_svc.create("Bank", AccountType.bank)
        snapshot_svc.record(acc.id, deposit=50_000, recorded_at=datetime(2025, 1, 1))
        # No to_date: should not crash and should return points up to today
        points = summary_svc.get_history(from_date=date(2025, 1, 1))
        assert len(points) >= 1

    def test_get_history_does_not_double_count_same_timestamp_snapshots(
        self, account_svc, snapshot_svc, summary_svc
    ):
        """Two snapshots for the same account recorded at the exact same timestamp
        must not both appear in get_latest_as_of — only the one entry should count."""
        loan = account_svc.create("Loan", AccountType.loan)
        ts = datetime(2025, 1, 15, 12, 0, 0)
        # Record same timestamp twice (can happen when user clicks Record twice on
        # the same day, since the dialog always stores T12:00:00)
        snapshot_svc.record(loan.id, deposit=-500_000, recorded_at=ts)
        snapshot_svc.record(loan.id, deposit=-500_000, recorded_at=ts)

        points = summary_svc.get_history(from_date=date(2025, 1, 1), to_date=date(2025, 1, 31))
        assert len(points) == 1
        assert points[0].loans == pytest.approx(-500_000)      # not -1_000_000
        assert points[0].net_worth == pytest.approx(-500_000)

    def test_get_history_current_month_matches_get_current(
        self, account_svc, snapshot_svc, asset_svc, summary_svc
    ):
        """The latest history point (current month) must equal get_current net worth."""
        bank = account_svc.create("Bank", AccountType.bank)
        loan = account_svc.create("Loan", AccountType.loan)
        snapshot_svc.record(bank.id, deposit=1_400_000)
        snapshot_svc.record(loan.id, deposit=-2_200_000)
        asset_svc.create("House", AssetType.real_estate, 3_000_000, date(2020, 1, 1), 0.06)

        current = summary_svc.get_current()
        points = summary_svc.get_history()
        assert len(points) >= 1
        assert points[-1].net_worth == pytest.approx(current.net_worth, rel=1e-3)

    def test_get_history_sold_asset_drops_out_after_sale_date(
        self, account_svc, snapshot_svc, asset_svc, summary_svc
    ):
        """A sold asset should contribute to net worth only during the ownership period."""
        bank = account_svc.create("Bank", AccountType.bank)
        snapshot_svc.record(bank.id, deposit=0, recorded_at=datetime(2022, 1, 1))
        asset_svc.create(
            "Old Apartment",
            AssetType.real_estate,
            2_000_000,
            date(2022, 1, 1),
            0.0,
            sold_at=date(2023, 1, 1),
            sold_for=2_200_000,
        )
        points = summary_svc.get_history(
            from_date=date(2022, 1, 1), to_date=date(2023, 6, 30)
        )
        # During ownership: asset_value > 0
        jan_2022 = next(p for p in points if p.date.year == 2022 and p.date.month == 1)
        assert jan_2022.asset_value == pytest.approx(2_000_000)
        # After sale: asset_value == 0
        jun_2023 = next(p for p in points if p.date.year == 2023 and p.date.month == 6)
        assert jun_2023.asset_value == pytest.approx(0.0)

    def test_get_history_current_month_includes_future_dated_snapshot(
        self, account_svc, snapshot_svc, summary_svc
    ):
        """A snapshot recorded with a future date (e.g. end of month) must appear
        in the current month's history point — same as get_current."""
        from datetime import timedelta
        loan = account_svc.create("Loan", AccountType.loan)
        future_ts = datetime.now() + timedelta(days=14)
        snapshot_svc.record(loan.id, deposit=-2_200_000, recorded_at=future_ts)

        current = summary_svc.get_current()
        points = summary_svc.get_history()
        assert len(points) >= 1
        # get_current correctly picks up the future-dated snapshot via get_latest_for_all
        assert current.net_worth == pytest.approx(-2_200_000)
        # history's current month point must agree with get_current
        assert points[-1].net_worth == pytest.approx(current.net_worth, rel=1e-3)
