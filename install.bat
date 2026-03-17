@echo off
setlocal

echo ===============================
echo   WFM Parser GUI installation
echo ===============================
echo.

cd /d "%~dp0" || (
    echo Failed to enter project root
    pause
    exit /b 1
)

git --version >nul 2>&1 || (
    echo Git is not installed or not in PATH
    pause
    exit /b 1
)

echo Updating git submodules...
git submodule update --init --recursive || (
    echo Failed to update git submodules
    pause
    exit /b 1
)

echo Installing root npm dependencies...
call npm install || (
    echo Root npm install failed
    pause
    exit /b 1
)

cd /d "%~dp0WFMarketApiJS" || (
    echo Failed to enter WFMarketApiJS directory
    pause
    exit /b 1
)

echo Installing WFMarketApiJS npm dependencies...
call npm install || (
    echo WFMarketApiJS npm install failed
    pause
    exit /b 1
)

echo.
echo ===============================
echo   Installation complete
echo ===============================
echo.
pause
