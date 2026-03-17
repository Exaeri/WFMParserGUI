@echo off
setlocal

echo ===============================
echo   WFM Parser GUI make build
echo ===============================
echo.

cd /d "%~dp0" || (
    echo Failed to enter project root
    pause
    exit /b 1
)

call npm run make || (
    echo.
    echo npm run make failed
    pause
    exit /b 1
)

echo.
echo ===============================
echo   Build complete

echo   Output folder: out

echo ===============================
echo.
pause
