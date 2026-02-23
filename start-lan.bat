@echo off
chcp 65001 >nul
setlocal EnableExtensions

set "ROOT=%~dp0"
if not exist "%ROOT%" (
  echo [ERROR] Project directory not found: "%ROOT%"
  echo Please ensure this script is placed in the project root.
  echo.
  pause
  exit /b 1
)
pushd "%ROOT%"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Please install Node.js 20+.
  echo Download: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Please check your Node.js installation.
  echo.
  pause
  exit /b 1
)

set VITE_PORT=5173

set "NEED_INSTALL=0"
if not exist "node_modules" set "NEED_INSTALL=1"
if not exist "node_modules\\.bin\\vite.cmd" set "NEED_INSTALL=1"

echo [1/2] Checking dependencies...
if "%NEED_INSTALL%"=="1" (
  echo Installing dependencies...
  npm install
  if errorlevel 1 (
    echo Dependency install failed. Check network or permissions.
    echo.
    pause
    exit /b 1
  )
)

echo [2/2] Starting frontend...
start "GalaxyLuo Frontend" /d "%ROOT%" cmd /k "npm run dev:lan"

echo.
echo Frontend: http://YOUR_IP:%VITE_PORT%
echo API:      /api (Cloudflare Pages Functions)
echo If LAN access fails, allow port 5173 in firewall.
echo.
pause
popd
endlocal
