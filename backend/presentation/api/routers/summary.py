from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_summary_service
from core.domain.models import CurrentSummary, SummaryPoint
from core.use_cases.summary import SummaryService

router = APIRouter(prefix="/api/summary", tags=["summary"])


@router.get("/current", response_model=CurrentSummary)
def get_current(
    exclude_accounts: list[UUID] = Query(default=[]),
    exclude_assets: list[UUID] = Query(default=[]),
    svc: SummaryService = Depends(get_summary_service),
):
    return svc.get_current(
        exclude_accounts=frozenset(exclude_accounts) if exclude_accounts else None,
        exclude_assets=frozenset(exclude_assets) if exclude_assets else None,
    )


@router.get("/history", response_model=list[SummaryPoint])
def get_history(
    from_date: date | None = None,
    to_date: date | None = None,
    exclude_accounts: list[UUID] = Query(default=[]),
    exclude_assets: list[UUID] = Query(default=[]),
    svc: SummaryService = Depends(get_summary_service),
):
    return svc.get_history(
        from_date,
        to_date,
        exclude_accounts=frozenset(exclude_accounts) if exclude_accounts else None,
        exclude_assets=frozenset(exclude_assets) if exclude_assets else None,
    )
