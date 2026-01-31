# Script to kill Next.js dev server and clear lock files

Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "Removing .next directory..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host ".next directory removed successfully" -ForegroundColor Green
} else {
    Write-Host ".next directory not found" -ForegroundColor Gray
}

Write-Host "Done! You can now run 'npm run dev' again." -ForegroundColor Green
