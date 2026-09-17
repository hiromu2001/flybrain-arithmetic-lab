@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo   FlyBrain Arithmetic Lab - Launcher
echo ========================================

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found. Install Python 3.11 or newer.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js 20 or newer.
  pause
  exit /b 1
)

if not exist "backend\.venv\Scripts\python.exe" (
  echo [1/4] Creating Python virtual environment...
  python -m venv backend\.venv
)

echo [2/4] Installing backend dependencies...
backend\.venv\Scripts\python.exe -m pip install -q -r backend\requirements.txt
if errorlevel 1 goto :fail

if not exist "frontend\node_modules" (
  echo [3/4] Installing frontend dependencies...
  call npm --prefix frontend install
  if errorlevel 1 goto :fail
) else (
  echo [3/4] Frontend dependencies already installed.
)

echo [4/4] Starting FlyBrain Lab...
start "FlyBrain Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"
start "FlyBrain Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Open http://localhost:5173 in your browser.
echo Two terminal windows were opened. Close them to stop the lab.
exit /b 0

:fail
echo.
echo [ERROR] Setup failed. Check the message above.
pause
exit /b 1
