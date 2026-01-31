# PowerShell script to help fix Firebase private key format in .env file

Write-Host "`n🔧 Firebase Private Key Format Helper`n" -ForegroundColor Cyan

$envPath = Join-Path $PSScriptRoot "..\.env"

if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found at: $envPath" -ForegroundColor Red
    Write-Host "`nPlease create a .env file first.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "Reading .env file..." -ForegroundColor Gray
$content = Get-Content $envPath -Raw

# Check if FIREBASE_ADMIN_PRIVATE_KEY exists
if ($content -notmatch 'FIREBASE_ADMIN_PRIVATE_KEY\s*=') {
    Write-Host "❌ FIREBASE_ADMIN_PRIVATE_KEY not found in .env file" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Found FIREBASE_ADMIN_PRIVATE_KEY" -ForegroundColor Green

# Extract the key value
if ($content -match 'FIREBASE_ADMIN_PRIVATE_KEY\s*=\s*["\']?([^"\']+)["\']?') {
    $currentKey = $matches[1]
    
    Write-Host "`nCurrent key length: $($currentKey.Length) characters" -ForegroundColor Gray
    
    # Check for common issues
    $issues = @()
    
    if ($currentKey -notmatch '-----BEGIN PRIVATE KEY-----') {
        $issues += "Missing BEGIN marker"
    }
    
    if ($currentKey -notmatch '-----END PRIVATE KEY-----') {
        $issues += "Missing END marker"
    }
    
    if ($currentKey.Length -lt 1000) {
        $issues += "Key seems too short (expected ~2000+ characters)"
    }
    
    if ($currentKey -match 'your-private-key|your-firebase') {
        $issues += "Key appears to be a placeholder"
    }
    
    if ($issues.Count -eq 0) {
        Write-Host "`n✅ Key format looks correct!" -ForegroundColor Green
        Write-Host "`nIf you're still getting errors, try:" -ForegroundColor Yellow
        Write-Host "  1. Generate a NEW private key from Firebase Console" -ForegroundColor White
        Write-Host "  2. Copy the ENTIRE 'private_key' value from the JSON file" -ForegroundColor White
        Write-Host "  3. Make sure it includes both BEGIN and END markers" -ForegroundColor White
        Write-Host "  4. Keep all \n characters as they are`n" -ForegroundColor White
    } else {
        Write-Host "`n❌ Found issues:" -ForegroundColor Red
        foreach ($issue in $issues) {
            Write-Host "  - $issue" -ForegroundColor Yellow
        }
        
        Write-Host "`n📝 How to fix:" -ForegroundColor Cyan
        Write-Host "  1. Go to: https://console.firebase.google.com" -ForegroundColor White
        Write-Host "  2. Select your project" -ForegroundColor White
        Write-Host "  3. Project Settings > Service Accounts" -ForegroundColor White
        Write-Host "  4. Click 'Generate new private key'" -ForegroundColor White
        Write-Host "  5. Open the downloaded JSON file" -ForegroundColor White
        Write-Host "  6. Copy the ENTIRE value of 'private_key' (it's very long!)" -ForegroundColor White
        Write-Host "  7. Paste it into your .env file like this:" -ForegroundColor White
        Write-Host '     FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"' -ForegroundColor Gray
        Write-Host "  8. Make sure to keep all \n characters`n" -ForegroundColor White
    }
} else {
    Write-Host "❌ Could not parse FIREBASE_ADMIN_PRIVATE_KEY from .env file" -ForegroundColor Red
}

Write-Host "`n💡 Tip: Run 'npm run validate:firebase' to test your configuration`n" -ForegroundColor Cyan
