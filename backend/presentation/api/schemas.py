from datetime import date, datetime

from pydantic import BaseModel, Field

from core.domain.models import Account, AccountType, AssetType, Snapshot


class AccountWithSnapshot(BaseModel):
    account: Account
    latest_snapshot: Snapshot | None


class CreateAccountRequest(BaseModel):
    name: str
    account_type: AccountType
    ownership_pct: float = Field(default=1.0, ge=0.0, le=1.0)
    notes: str | None = None


class UpdateAccountRequest(BaseModel):
    name: str | None = None
    ownership_pct: float | None = Field(default=None, ge=0.0, le=1.0)
    notes: str | None = None
    is_active: bool | None = None


class CreateSnapshotRequest(BaseModel):
    deposit: float
    unrealized_return: float = 0.0
    recorded_at: datetime | None = None


class UpdateSnapshotRequest(BaseModel):
    deposit: float
    unrealized_return: float = 0.0
    recorded_at: datetime


class CreateAssetRequest(BaseModel):
    name: str
    asset_type: AssetType
    purchase_price: float = Field(gt=0)
    purchase_date: date
    annual_growth_rate: float
    ownership_pct: float = Field(default=1.0, ge=0.0, le=1.0)
    notes: str | None = None
    sold_at: date | None = None
    sold_for: float | None = None


class UpdateAssetRequest(BaseModel):
    name: str | None = None
    annual_growth_rate: float | None = None
    ownership_pct: float | None = Field(default=None, ge=0.0, le=1.0)
    notes: str | None = None
    sold_at: date | None = None
    sold_for: float | None = None
    is_active: bool | None = None
