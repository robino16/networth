from datetime import datetime
from uuid import UUID

from core.domain.models import Snapshot
from core.ports.repositories import AccountRepository, SnapshotRepository


class SnapshotService:
    def __init__(self, repo: SnapshotRepository, account_repo: AccountRepository) -> None:
        self.repo = repo
        self.account_repo = account_repo

    def record(
        self,
        account_id: UUID,
        deposit: float,
        unrealized_return: float = 0.0,
        recorded_at: datetime | None = None,
    ) -> Snapshot:
        if not self.account_repo.get_by_id(account_id):
            raise ValueError(f"Account {account_id} not found")
        kwargs: dict = {"account_id": account_id, "deposit": deposit, "unrealized_return": unrealized_return}
        if recorded_at is not None:
            kwargs["recorded_at"] = recorded_at
        return self.repo.save(Snapshot(**kwargs))

    def get_history(self, account_id: UUID) -> list[Snapshot]:
        if not self.account_repo.get_by_id(account_id):
            raise ValueError(f"Account {account_id} not found")
        return self.repo.get_for_account(account_id)

    def update(
        self,
        account_id: UUID,
        snapshot_id: UUID,
        deposit: float,
        unrealized_return: float,
        recorded_at: datetime,
    ) -> Snapshot:
        if not self.account_repo.get_by_id(account_id):
            raise ValueError(f"Account {account_id} not found")
        snapshot = Snapshot(
            id=snapshot_id,
            account_id=account_id,
            deposit=deposit,
            unrealized_return=unrealized_return,
            recorded_at=recorded_at,
        )
        return self.repo.update(snapshot)

    def delete(self, account_id: UUID, snapshot_id: UUID) -> None:
        if not self.account_repo.get_by_id(account_id):
            raise ValueError(f"Account {account_id} not found")
        self.repo.delete(account_id, snapshot_id)

    def get_latest_for_all(self) -> dict[UUID, Snapshot]:
        return self.repo.get_latest_for_all()
