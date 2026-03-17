@echo off
setlocal

echo ===============================
echo   WFM Parser GUI publish
echo ===============================
echo.

cd /d "%~dp0" || (
    echo Failed to enter project root
    pause
    exit /b 1
)

call npm run publish || (
    echo.
    echo npm run publish failed
    pause
    exit /b 1
)

echo.
echo ===============================
echo   Publish complete

echo ===============================
echo.
pause
