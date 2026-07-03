from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_snapshot_service
from core.domain.models import Snapshot
from core.use_cases.snapshots import SnapshotService
from presentation.api.schemas import CreateSnapshotRequest, UpdateSnapshotRequest

router = APIRouter(prefix="/api/accounts/{account_id}/snapshots", tags=["snapshots"])


@router.post("", response_model=Snapshot, status_code=201)
def create_snapshot(
    account_id: UUID,
    body: CreateSnapshotRequest,
    svc: SnapshotService = Depends(get_snapshot_service),
):
    try:
        return svc.record(account_id=account_id, **body.model_dump())
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("", response_model=list[Snapshot])
def get_snapshots(
    account_id: UUID,
    svc: SnapshotService = Depends(get_snapshot_service),
):
    try:
        return svc.get_history(account_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.put("/{snapshot_id}", response_model=Snapshot)
def update_snapshot(
    account_id: UUID,
    snapshot_id: UUID,
    body: UpdateSnapshotRequest,
    svc: SnapshotService = Depends(get_snapshot_service),
):
    try:
        return svc.update(
            account_id=account_id,
            snapshot_id=snapshot_id,
            deposit=body.deposit,
            unrealized_return=body.unrealized_return,
            recorded_at=body.recorded_at,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.delete("/{snapshot_id}", status_code=204)
def delete_snapshot(
    account_id: UUID,
    snapshot_id: UUID,
    svc: SnapshotService = Depends(get_snapshot_service),
):
    try:
        svc.delete(account_id=account_id, snapshot_id=snapshot_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
