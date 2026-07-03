from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_account_service, get_snapshot_service
from core.domain.models import Account
from core.use_cases.accounts import AccountService
from core.use_cases.snapshots import SnapshotService
from presentation.api.schemas import AccountWithSnapshot, CreateAccountRequest, UpdateAccountRequest

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountWithSnapshot])
def list_accounts(
    include_inactive: bool = False,
    account_svc: AccountService = Depends(get_account_service),
    snapshot_svc: SnapshotService = Depends(get_snapshot_service),
):
    accounts = account_svc.list(include_inactive)
    latest = snapshot_svc.get_latest_for_all()
    return [AccountWithSnapshot(account=a, latest_snapshot=latest.get(a.id)) for a in accounts]


@router.post("", response_model=Account, status_code=201)
def create_account(body: CreateAccountRequest, svc: AccountService = Depends(get_account_service)):
    return svc.create(**body.model_dump())


@router.get("/{id}", response_model=Account)
def get_account(id: UUID, svc: AccountService = Depends(get_account_service)):
    try:
        return svc.get(id)
    except ValueError:
        raise HTTPException(404, "Account not found")


@router.put("/{id}", response_model=Account)
def update_account(
    id: UUID,
    body: UpdateAccountRequest,
    svc: AccountService = Depends(get_account_service),
):
    try:
        return svc.update(id, **body.model_dump(exclude_unset=True))
    except ValueError:
        raise HTTPException(404, "Account not found")


@router.delete("/{id}", status_code=204)
def deactivate_account(id: UUID, svc: AccountService = Depends(get_account_service)):
    try:
        svc.deactivate(id)
    except ValueError:
        raise HTTPException(404, "Account not found")
