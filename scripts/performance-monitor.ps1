# Performance Monitoring Script
# Monitors system resources during load tests

Write-Host "📊 CreditMaster Pro - Performance Monitor" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$monitorDuration = 300 # 5 minutes
$sampleInterval = 5 # 5 seconds
$outputFile = "artillery/reports/performance-metrics_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').csv"

# Create reports directory if it doesn't exist
$reportsDir = "artillery/reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

# Initialize CSV file
"Timestamp,CPU_Percent,Memory_MB,Memory_Percent,Disk_Read_MB,Disk_Write_MB,Network_Sent_MB,Network_Received_MB" | Out-File -FilePath $outputFile

Write-Host "🔍 Monitoring system performance..." -ForegroundColor Yellow
Write-Host "Duration: $monitorDuration seconds" -ForegroundColor Gray
Write-Host "Sample interval: $sampleInterval seconds" -ForegroundColor Gray
Write-Host "Output: $outputFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""

# Get process ID for Node.js (if running)
$nodeProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($nodeProcess) {
    Write-Host "✅ Found Node.js process (PID: $($nodeProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "⚠️  Node.js process not found. Monitoring system-wide metrics." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Timestamp          | CPU%  | Memory (MB) | Memory% | Status" -ForegroundColor Cyan
Write-Host "-------------------|-------|-------------|---------|--------" -ForegroundColor Cyan

$samples = 0
$maxSamples = [math]::Floor($monitorDuration / $sampleInterval)

try {
    while ($samples -lt $maxSamples) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        
        # Get CPU usage
        $cpuPercent = (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples.CookedValue
        if (-not $cpuPercent) { $cpuPercent = 0 }
        
        # Get memory usage
        $os = Get-CimInstance Win32_OperatingSystem
        $totalMemory = $os.TotalVisibleMemorySize / 1MB
        $freeMemory = $os.FreePhysicalMemory / 1MB
        $usedMemory = $totalMemory - $freeMemory
        $memoryPercent = ($usedMemory / $totalMemory) * 100
        
        # Get disk I/O (if available)
        $diskRead = 0
        $diskWrite = 0
        try {
            $diskCounter = Get-Counter '\PhysicalDisk(_Total)\Disk Read Bytes/sec', '\PhysicalDisk(_Total)\Disk Write Bytes/sec' -ErrorAction SilentlyContinue
            $diskRead = ($diskCounter.CounterSamples[0].CookedValue / 1MB)
            $diskWrite = ($diskCounter.CounterSamples[1].CookedValue / 1MB)
        } catch {
            # Disk counters not available
        }
        
        # Get network I/O (if available)
        $networkSent = 0
        $networkReceived = 0
        try {
            $networkCounter = Get-Counter '\Network Interface(*)\Bytes Sent/sec', '\Network Interface(*)\Bytes Received/sec' -ErrorAction SilentlyContinue
            $networkSent = ($networkCounter.CounterSamples | Where-Object { $_.Path -like "*Bytes Sent*" } | Measure-Object -Property CookedValue -Sum).Sum / 1MB
            $networkReceived = ($networkCounter.CounterSamples | Where-Object { $_.Path -like "*Bytes Received*" } | Measure-Object -Property CookedValue -Sum).Sum / 1MB
        } catch {
            # Network counters not available
        }
        
        # Determine status
        $status = "✅ OK"
        if ($cpuPercent -gt 80) { $status = "⚠️  HIGH CPU" }
        if ($memoryPercent -gt 80) { $status = "⚠️  HIGH MEM" }
        if ($cpuPercent -gt 90 -or $memoryPercent -gt 90) { $status = "🔥 CRITICAL" }
        
        # Write to CSV
        "$timestamp,$([math]::Round($cpuPercent, 2)),$([math]::Round($usedMemory, 2)),$([math]::Round($memoryPercent, 2)),$([math]::Round($diskRead, 2)),$([math]::Round($diskWrite, 2)),$([math]::Round($networkSent, 2)),$([math]::Round($networkReceived, 2))" | Out-File -FilePath $outputFile -Append
        
        # Display to console
        $cpuColor = if ($cpuPercent -gt 80) { "Red" } elseif ($cpuPercent -gt 60) { "Yellow" } else { "Green" }
        $memColor = if ($memoryPercent -gt 80) { "Red" } elseif ($memoryPercent -gt 60) { "Yellow" } else { "Green" }
        
        Write-Host "$timestamp | " -NoNewline
        Write-Host "$([math]::Round($cpuPercent, 1))% " -NoNewline -ForegroundColor $cpuColor
        Write-Host " | " -NoNewline
        Write-Host "$([math]::Round($usedMemory, 0)) MB    " -NoNewline -ForegroundColor $memColor
        Write-Host " | " -NoNewline
        Write-Host "$([math]::Round($memoryPercent, 1))%  " -NoNewline -ForegroundColor $memColor
        Write-Host " | " -NoNewline
        Write-Host "$status"
        
        $samples++
        Start-Sleep -Seconds $sampleInterval
    }
} catch {
    Write-Host ""
    Write-Host "⚠️  Monitoring interrupted" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📊 Monitoring Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📄 Metrics saved to: $outputFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  - Total samples: $samples" -ForegroundColor White
Write-Host "  - Duration: $($samples * $sampleInterval) seconds" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open $outputFile in Excel" -ForegroundColor White
Write-Host "  2. Create charts to visualize trends" -ForegroundColor White
Write-Host "  3. Identify performance bottlenecks" -ForegroundColor White
Write-Host ""

