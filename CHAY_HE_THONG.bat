@echo off
title HE THONG TAO DE KTTX
echo ========================================================
echo       HE THONG TAO DE KIEM TRA THUONG XUYEN (AI)
echo ========================================================
echo.
echo Dang kiem tra moi truong...

node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [LOI] He thong khong tim thay Node.js.
    echo Vui long tai va cai dat Node.js tu https://nodejs.org/
    echo Sau khi cai dat xong, hay mo lai file nay.
    pause
    exit /b
)

IF NOT EXIST "node_modules\" (
    echo.
    echo [THONG BAO] Chay lan dau tien, dang cai dat cac thanh phan can thiet...
    echo Qua trinh nay co the mat 1-2 phut tuy toc do mang, vui long khong tat cua so.
    call npm install
    echo Cai dat hoan tat!
)

echo.
echo [THANH CONG] Dang khoi dong he thong...
echo Trinh duyet se tu dong mo len trong vai giay toi.
echo.
echo ========================================================
echo LUU Y QUAN TRONG:
echo - Hay thu nho (minimize) cua so nay xuong.
echo - KHONG tat cua so mau den nay khi dang su dung phan mem!
echo ========================================================
echo.

REM Len lich tu dong mo trinh duyet sau 4 giay
start cmd /c "timeout /t 4 /nobreak > nul & start http://localhost:3000"

REM Khoi chay server ngay trong cua so hien tai
call npm run dev

pause
