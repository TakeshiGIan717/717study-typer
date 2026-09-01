@echo off
cd /d "%~dp0"
set "PYTHON_CMD=py"
where py >nul 2>nul || set "PYTHON_CMD=python"
where %PYTHON_CMD% >nul 2>nul || (
  echo Python 3.10 or newer is required. Please install it first.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  %PYTHON_CMD% -m venv .venv
)
.venv\Scripts\python.exe app.py
if errorlevel 1 pause
