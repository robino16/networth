from uuid import UUID

from core.domain.models import Account, AccountType
from core.ports.repositories import AccountRepository


class AccountService:
    def __init__(self, repo: AccountRepository) -> None:
        self.repo = repo

    def list(self, include_inactive: bool = False) -> list[Account]:
        return self.repo.get_all(include_inactive)

    def get(self, id: UUID) -> Account:
        account = self.repo.get_by_id(id)
        if not account:
            raise ValueError(f"Account {id} not found")
        return account

    def create(
        self,
        name: str,
        account_type: AccountType,
        ownership_pct: float = 1.0,
        notes: str | None = None,
    ) -> Account:
        account = Account(name=name, account_type=account_type, ownership_pct=ownership_pct, notes=notes)
        return self.repo.save(account)

    def update(self, id: UUID, **kwargs: object) -> Account:
        account = self.get(id)
        return self.repo.update(account.model_copy(update=kwargs))

    def deactivate(self, id: UUID) -> None:
        account = self.get(id)
        self.repo.update(account.model_copy(update={"is_active": False}))
