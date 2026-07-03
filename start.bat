@echo off

echo Starting backend...
start "backend" cmd /c "cd backend && uv run uvicorn app.main:app --reload"

echo Starting frontend...
start "frontend" cmd /c "cd frontend && bun dev"

timeout /t 3 /nobreak >nul

echo Opening browser...
start http://localhost:3000

exit
