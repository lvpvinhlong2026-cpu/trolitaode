$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conns) {
    foreach ($c in $conns) {
        try {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "  - Da dung tien trinh PID: $($c.OwningProcess)" -ForegroundColor Cyan
        } catch {}
    }
    Write-Host "[THANH CONG] Da dung toan bo dich vu va giai phong cong 3000!" -ForegroundColor Green
} else {
    Write-Host "[THONG BAO] Khong co dich vu nao dang chiem cong 3000." -ForegroundColor Yellow
}
