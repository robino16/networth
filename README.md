# Net Worth Tracker

A personal net worth tracker with manual data entry. Log account balances at any point in time and visualize your net worth over time — including loans, crypto, funds, and shared assets.

## Features

- Manual balance snapshots per account (no transaction tracking)
- Separates deposited capital ("innskudd") from unrealized returns
- Handles partial ownership (e.g. 50% of a shared home + mortgage)
- Charts: net worth over time, asset breakdown, loan exposure
- Toggleable views: include/exclude unrealized returns, personal vs shared

## Stack

- **Backend**: Python / FastAPI / SQLite
- **Frontend**: Next.js / Tailwind CSS / shadcn/ui

## Running

```bash
# Backend
cd backend
uv run uvicorn app.main:app --reload

# Frontend
cd frontend
bun dev
```
