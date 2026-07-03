from calendar import monthrange
from datetime import date
from uuid import UUID

from core.domain.models import AccountType, CurrentSummary, SummaryPoint
from core.ports.repositories import AccountRepository, AssetRepository, SnapshotRepository


def _end_of_month(d: date) -> date:
    return date(d.year, d.month, monthrange(d.year, d.month)[1])


class SummaryService:
    def __init__(
        self,
        account_repo: AccountRepository,
        snapshot_repo: SnapshotRepository,
        asset_repo: AssetRepository,
    ) -> None:
        self.account_repo = account_repo
        self.snapshot_repo = snapshot_repo
        self.asset_repo = asset_repo

    def get_current(
        self,
        exclude_accounts: frozenset[UUID] | None = None,
        exclude_assets: frozenset[UUID] | None = None,
    ) -> CurrentSummary:
        accounts = self.account_repo.get_all()
        latest = self.snapshot_repo.get_latest_for_all()
        assets = self.asset_repo.get_all()

        deposits = 0.0
        unrealized = 0.0
        loans = 0.0
        loans_personal = 0.0

        for account in accounts:
            if exclude_accounts and account.id in exclude_accounts:
                continue
            snap = latest.get(account.id)
            if not snap:
                continue
            if account.account_type == AccountType.loan:
                loans += snap.total
                loans_personal += snap.total * account.ownership_pct
            else:
                deposits += snap.deposit * account.ownership_pct
                unrealized += snap.unrealized_return * account.ownership_pct

        asset_value = sum(
            a.estimated_value() * a.ownership_pct
            for a in assets
            if not (exclude_assets and a.id in exclude_assets)
        )
        net_worth = deposits + unrealized + loans_personal + asset_value

        return CurrentSummary(
            net_worth=net_worth,
            total_loans=loans,
            total_loans_personal=loans_personal,
            total_deposits=deposits,
            unrealized_return=unrealized,
            asset_value=asset_value,
        )

    def get_history(
        self,
        from_date: date | None = None,
        to_date: date | None = None,
        exclude_accounts: frozenset[UUID] | None = None,
        exclude_assets: frozenset[UUID] | None = None,
    ) -> list[SummaryPoint]:
        earliest = self.snapshot_repo.get_earliest_date()
        if earliest is None:
            return []

        start = date(
            (from_date or earliest).year,
            (from_date or earliest).month,
            1,
        )
        end = to_date or date.today()

        if start > end:
            return []

        accounts = {a.id: a for a in self.account_repo.get_all(include_inactive=False)}
        assets = self.asset_repo.get_all()
        today = date.today()

        points: list[SummaryPoint] = []
        current = start

        while current <= end:
            point_date = min(_end_of_month(current), today)

            if point_date >= today:
                # Delegate to get_current() so the graph's rightmost point is
                # always computed identically to the summary card — same account
                # filter (active only), same snapshot source, same asset scope.
                cs = self.get_current(exclude_accounts=exclude_accounts, exclude_assets=exclude_assets)
                points.append(SummaryPoint(
                    date=point_date,
                    net_worth=cs.net_worth,
                    deposits=cs.total_deposits,
                    unrealized_return=cs.unrealized_return,
                    loans=cs.total_loans_personal,
                    asset_value=cs.asset_value,
                ))
            else:
                snaps = {s.account_id: s for s in self.snapshot_repo.get_latest_as_of(point_date)}

                deposits = 0.0
                unrealized = 0.0
                loans = 0.0

                for snap in snaps.values():
                    account = accounts.get(snap.account_id)
                    if not account:
                        continue
                    if exclude_accounts and account.id in exclude_accounts:
                        continue
                    if account.account_type == AccountType.loan:
                        loans += snap.total * account.ownership_pct
                    else:
                        deposits += snap.deposit * account.ownership_pct
                        unrealized += snap.unrealized_return * account.ownership_pct

                asset_value = sum(
                    a.estimated_value(at=point_date) * a.ownership_pct
                    for a in assets
                    if a.purchase_date <= point_date and not (exclude_assets and a.id in exclude_assets)
                )

                points.append(SummaryPoint(
                    date=point_date,
                    net_worth=deposits + unrealized + loans + asset_value,
                    deposits=deposits,
                    unrealized_return=unrealized,
                    loans=loans,
                    asset_value=asset_value,
                ))

            # Advance one month
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)

        return points
