from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime
from enum import Enum
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, computed_field


class AccountType(str, Enum):
    bank = "bank"
    savings = "savings"
    loan = "loan"
    funds = "funds"
    stocks = "stocks"
    crypto = "crypto"
    pension = "pension"
    other = "other"


class AssetType(str, Enum):
    real_estate = "real_estate"
    vehicle = "vehicle"
    other = "other"


class Account(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    account_type: AccountType
    ownership_pct: float = 1.0
    currency: str = "NOK"
    notes: str | None = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)


class Snapshot(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    account_id: UUID
    recorded_at: datetime = Field(default_factory=datetime.now)
    deposit: float
    unrealized_return: float = 0.0

    @computed_field
    @property
    def total(self) -> float:
        return self.deposit + self.unrealized_return


class Asset(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    asset_type: AssetType
    purchase_price: float
    purchase_date: date
    annual_growth_rate: float
    ownership_pct: float = 1.0
    notes: str | None = None
    sold_at: date | None = None
    sold_for: float | None = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)

    def estimated_value(self, at: date | None = None) -> float:
        reference = at or date.today()
        if self.sold_at is not None and reference >= self.sold_at:
            return 0.0
        if reference < self.purchase_date:
            return self.purchase_price
        years = (reference - self.purchase_date).days / 365.25
        return self.purchase_price * (1 + self.annual_growth_rate) ** years

    @computed_field
    @property
    def current_estimated_value(self) -> float:
        return self.estimated_value()


class CurrentSummary(BaseModel):
    net_worth: float
    total_loans: float
    total_loans_personal: float
    total_deposits: float
    unrealized_return: float
    asset_value: float


class SummaryPoint(BaseModel):
    date: date
    net_worth: float
    deposits: float
    unrealized_return: float
    loans: float
    asset_value: float
