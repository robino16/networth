import pytest

import infra.database
from infra.database import init_db
from infra.repositories.account_repo import SQLiteAccountRepository
from infra.repositories.asset_repo import SQLiteAssetRepository
from infra.repositories.snapshot_repo import SQLiteSnapshotRepository
from core.use_cases.accounts import AccountService
from core.use_cases.assets import AssetService
from core.use_cases.snapshots import SnapshotService
from core.use_cases.summary import SummaryService


@pytest.fixture
def db(tmp_path, monkeypatch):
    monkeypatch.setattr(infra.database, "DB_PATH", tmp_path / "test.db")
    init_db()


@pytest.fixture
def account_repo(db):
    return SQLiteAccountRepository()


@pytest.fixture
def snapshot_repo(db):
    return SQLiteSnapshotRepository()


@pytest.fixture
def asset_repo(db):
    return SQLiteAssetRepository()


@pytest.fixture
def account_svc(account_repo):
    return AccountService(account_repo)


@pytest.fixture
def snapshot_svc(snapshot_repo, account_repo):
    return SnapshotService(snapshot_repo, account_repo)


@pytest.fixture
def asset_svc(asset_repo):
    return AssetService(asset_repo)


@pytest.fixture
def summary_svc(account_repo, snapshot_repo, asset_repo):
    return SummaryService(account_repo, snapshot_repo, asset_repo)
