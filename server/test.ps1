$outLog = "server.out.log"
$errLog = "server.err.log"
# Remove existing log files if present
if (Test-Path $outLog) { Remove-Item $outLog }
if (Test-Path $errLog) { Remove-Item $errLog }

# Start the server
Write-Host "Starting server..."
$p = Start-Process -FilePath "node" -ArgumentList "src/index.js" -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru

# Wait for the server to start
$started = $false
$maxWait = 30
$elapsed = 0
while (-not $started -and $elapsed -lt $maxWait) {
    Start-Sleep -Seconds 1
    $elapsed++
    if (Test-Path $outLog) {
        $logContent = Get-Content $outLog
        if ($logContent -like "*HENRIQUE BARBER API rodando em*") {
            $started = $true
            Write-Host "Server started successfully."
            break
        }
    }
}

if (-not $started) {
    Write-Error "Server did not start within $maxWait seconds."
    # Log the last 20 lines of the log for debugging
    if (Test-Path $outLog) {
        Write-Host "Last 20 lines of out log:"
        Get-Content $outLog -Tail 20
    }
    if (Test-Path $errLog) {
        Write-Host "Last 20 lines of err log:"
        Get-Content $errLog -Tail 20
    }
    Stop-Process -Id $p.Id
    exit 1
}

# Give the server a moment to fully initialize
Start-Sleep -Seconds 2

try {
    # Test shop endpoint
    Write-Host "Testing /api/public/shop..."
    $shopResponse = Invoke-WebRequest -Uri "http://localhost:3333/api/public/shop" -Method Get -UseBasicParsing -ErrorAction Stop
    $shop = $shopResponse.Content | ConvertFrom-Json
    Write-Host "Shop endpoint succeeded. Shop name: $($shop.shop.name)"

    # Get first service and barber IDs
    if (-not $shop.services -or $shop.services.Length -eq 0) {
        throw "No services found in shop response."
    }
    if (-not $shop.barbers -or $shop.barbers.Length -eq 0) {
        throw "No barbers found in shop response."
    }
    $firstServiceId = $shop.services[0].id
    $firstBarberId = $shop.barbers[0].id
    Write-Host "Using service ID: $firstServiceId, barber ID: $firstBarberId"

    # Test days endpoint
    Write-Host "Testing /api/public/days..."
    $daysResponse = Invoke-WebRequest -Uri "http://localhost:3333/api/public/days?service_id=$firstServiceId&barber_id=$firstBarberId&days=5" -Method Get -UseBasicParsing -ErrorAction Stop
    $days = $daysResponse.Content | ConvertFrom-Json
    Write-Host "Days endpoint succeeded. Returned $(($days | Measure-Object).Count) days."

    # Test availability endpoint for today
    $today = Get-Date -Format "yyyy-MM-dd"
    Write-Host "Testing /api/public/availability for date $today..."
    $availResponse = Invoke-WebRequest -Uri "http://localhost:3333/api/public/availability?date=$today&barber_id=$firstBarberId&service_id=$firstServiceId" -Method Get -UseBasicParsing -ErrorAction Stop
    $avail = $availResponse.Content | ConvertFrom-Json
    Write-Host "Availability endpoint succeeded. Found $($avail.Count) available slots."

    # Test whatsapp endpoint
    Write-Host "Testing /api/public/whatsapp..."
    $whatsappResponse = Invoke-WebRequest -Uri "http://localhost:3333/api/public/whatsapp" -Method Get -UseBasicParsing -ErrorAction Stop
    $whatsapp = $whatsappResponse.Content | ConvertFrom-Json
    Write-Host "WhatsApp endpoint succeeded. URL: $($whatsapp.url)"

    Write-Host "`nAll tests passed!" 
} catch {
    Write-Error "Test failed: $($_.Exception.Message)"
    # Log the last 20 lines of the log for debugging
    if (Test-Path $outLog) {
        Write-Host "Last 20 lines of out log:"
        Get-Content $outLog -Tail 20
    }
    if (Test-Path $errLog) {
        Write-Host "Last 20 lines of err log:"
        Get-Content $errLog -Tail 20
    }
    exit 1
} finally {
    # Stop the server
    Write-Host "Stopping server..."
    Stop-Process -Id $p.Id
}