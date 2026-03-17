@echo off
setlocal

cd /d "%~dp0" || (
    echo Failed to enter project root
    pause
    exit /b 1
)

call npm start || (
    echo.
    echo npm start failed
    pause
    exit /b 1
)

pause
