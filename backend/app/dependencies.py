from core.use_cases.accounts import AccountService
from core.use_cases.assets import AssetService
from core.use_cases.snapshots import SnapshotService
from core.use_cases.summary import SummaryService
from infra.repositories.account_repo import SQLiteAccountRepository
from infra.repositories.asset_repo import SQLiteAssetRepository
from infra.repositories.snapshot_repo import SQLiteSnapshotRepository

_account_repo = SQLiteAccountRepository()
_snapshot_repo = SQLiteSnapshotRepository()
_asset_repo = SQLiteAssetRepository()


def get_account_service() -> AccountService:
    return AccountService(_account_repo)


def get_snapshot_service() -> SnapshotService:
    return SnapshotService(_snapshot_repo, _account_repo)


def get_asset_service() -> AssetService:
    return AssetService(_asset_repo)


def get_summary_service() -> SummaryService:
    return SummaryService(_account_repo, _snapshot_repo, _asset_repo)
