from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_asset_service
from core.domain.models import Asset
from core.use_cases.assets import AssetService
from presentation.api.schemas import CreateAssetRequest, UpdateAssetRequest

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=list[Asset])
def list_assets(
    include_inactive: bool = False,
    svc: AssetService = Depends(get_asset_service),
):
    return svc.list(include_inactive)


@router.post("", response_model=Asset, status_code=201)
def create_asset(body: CreateAssetRequest, svc: AssetService = Depends(get_asset_service)):
    return svc.create(**body.model_dump())


@router.get("/{id}", response_model=Asset)
def get_asset(id: UUID, svc: AssetService = Depends(get_asset_service)):
    try:
        return svc.get(id)
    except ValueError:
        raise HTTPException(404, "Asset not found")


@router.put("/{id}", response_model=Asset)
def update_asset(
    id: UUID,
    body: UpdateAssetRequest,
    svc: AssetService = Depends(get_asset_service),
):
    try:
        return svc.update(id, **body.model_dump(exclude_unset=True))
    except ValueError:
        raise HTTPException(404, "Asset not found")


@router.delete("/{id}", status_code=204)
def deactivate_asset(id: UUID, svc: AssetService = Depends(get_asset_service)):
    try:
        svc.deactivate(id)
    except ValueError:
        raise HTTPException(404, "Asset not found")
