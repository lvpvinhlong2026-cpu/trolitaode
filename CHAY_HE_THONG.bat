@echo off
title TRỢ LÍ TẠO ĐỀ - CHUẨN CV 7991
cd /d "%~dp0"

echo ====================================================================
echo                         TRỢ LÍ TẠO ĐỀ
echo        He Thong Tao De Kiem Tra Chuan Cong Van 7991 (BGD & DT)
echo     Ma Tran, Dac Ta, Tron 4 Ma De, Thi Thu Online, Do Thi 300 DPI
echo                   Tac gia: GV Le Vinh Phuc (0944405124)
echo ====================================================================
echo.

:: 1. Nap duong dan moi truong Bun, Node, NPM
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64;%USERPROFILE%\.bun\bin;C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Microsoft\WindowsApps;%PATH%"

:: 2. Kiem tra Bun hoac Node
set "RUNNER="
where bun >nul 2>nul
if %errorlevel% equ 0 (
    set "RUNNER=bun"
) else (
    where node >nul 2>nul
    if %errorlevel% equ 0 (
        set "RUNNER=node"
    )
)

if "%RUNNER%"=="" (
    echo [!] Chua tim thay Bun hoac Node.js.
    echo [*] Dang tien hanh cai dat Bun tu dong qua WinGet...
    winget install Oven-sh.Bun --accept-source-agreements --accept-package-agreements
    set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Oven-sh.Bun_Microsoft.Winget.Source_8wekyb3d8bbwe\bun-windows-x64;%PATH%"
    where bun >nul 2>nul
    if %errorlevel% equ 0 (
        set "RUNNER=bun"
    ) else (
        echo [X] Khong the khoi dong. Vui long cai dat Node.js tu https://nodejs.org/
        pause
        exit /b 1
    )
)

:: 3. Kiem tra file cau hinh moi truong
if not exist ".env" (
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
    ) else (
        echo GEMINI_API_KEY="" > .env
        echo PORT=3001 >> .env
    )
)

:: 4. Kiem tra thu vien node_modules
if not exist "node_modules\" (
    echo [*] Dang cai dat thu vien cho lan dau su dung...
    if "%RUNNER%"=="bun" (
        bun install
    ) else (
        npm install
    )
)

:: 5. Tu dong mo trinh duyet tai cong 3001 sau 2 giay
start "" powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3001'"

echo ====================================================================
echo   TRỢ LÍ TẠO ĐỀ ĐÃ SẴN SÀNG!
echo   - May chu: http://localhost:3001
echo   - Trinh duyet web se tu dong mo trong 2 giay...
echo   - De dung he thong: Dong cua so nay hoac nhan Ctrl + C
echo ====================================================================
echo.

:: 6. Khoi chay may chu tren port 3001
set PORT=3001
if "%RUNNER%"=="bun" (
    bun server.ts
) else (
    npm run dev
)

if %errorlevel% neq 0 (
    echo.
    echo [!] May chu da dung hoac co loi.
    pause
)
