# Artillery Load Testing Script
# Run all load tests and generate reports

Write-Host "🚀 CreditMaster Pro - Load Testing Suite" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Artillery is installed
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: npx not found. Please install Node.js" -ForegroundColor Red
    exit 1
}

# Create reports directory
$reportsDir = "artillery/reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
    Write-Host "✅ Created reports directory" -ForegroundColor Green
}

# Get timestamp for report names
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

Write-Host ""
Write-Host "📊 Test Suite Overview:" -ForegroundColor Yellow
Write-Host "  1. API Tests (2 minutes)" -ForegroundColor White
Write-Host "  2. Load Tests (8 minutes)" -ForegroundColor White
Write-Host "  3. Stress Tests (5 minutes)" -ForegroundColor White
Write-Host "  Total estimated time: ~15 minutes" -ForegroundColor White
Write-Host ""

# Ask for confirmation
$confirm = Read-Host "Do you want to run all tests? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ Tests cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "🔥 Starting test suite..." -ForegroundColor Cyan
Write-Host ""

# Test 1: API Tests
Write-Host "📊 Test 1/3: API Load Tests" -ForegroundColor Yellow
Write-Host "Duration: ~2 minutes" -ForegroundColor Gray
Write-Host "Target: 20 requests/second" -ForegroundColor Gray
Write-Host ""

$apiReport = "$reportsDir/api-tests_$timestamp.json"
npx artillery run artillery/api-tests.yml --output $apiReport

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ API tests completed" -ForegroundColor Green
    
    # Generate HTML report
    $apiHtml = "$reportsDir/api-tests_$timestamp.html"
    npx artillery report $apiReport --output $apiHtml
    Write-Host "📄 Report saved: $apiHtml" -ForegroundColor Cyan
}
else {
    Write-Host "❌ API tests failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "⏸️  Waiting 30 seconds before next test..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Test 2: Load Tests
Write-Host ""
Write-Host "📊 Test 2/3: Load Tests" -ForegroundColor Yellow
Write-Host "Duration: ~8 minutes" -ForegroundColor Gray
Write-Host "Target: 5-100 requests/second (ramping)" -ForegroundColor Gray
Write-Host ""

$loadReport = "$reportsDir/load-tests_$timestamp.json"
npx artillery run artillery/load-tests.yml --output $loadReport

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Load tests completed" -ForegroundColor Green
    
    # Generate HTML report
    $loadHtml = "$reportsDir/load-tests_$timestamp.html"
    npx artillery report $loadReport --output $loadHtml
    Write-Host "📄 Report saved: $loadHtml" -ForegroundColor Cyan
}
else {
    Write-Host "❌ Load tests failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "⏸️  Waiting 30 seconds before next test..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Test 3: Stress Tests
Write-Host ""
Write-Host "📊 Test 3/3: Stress Tests" -ForegroundColor Yellow
Write-Host "Duration: ~5 minutes" -ForegroundColor Gray
Write-Host "Target: 50-1000 requests/second (stress)" -ForegroundColor Gray
Write-Host "⚠️  Warning: This will push the system to its limits" -ForegroundColor Red
Write-Host ""

$stressConfirm = Read-Host "Run stress tests? (y/n)"
if ($stressConfirm -eq "y") {
    $stressReport = "$reportsDir/stress-tests_$timestamp.json"
    npx artillery run artillery/stress-tests.yml --output $stressReport
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Stress tests completed" -ForegroundColor Green
        
        # Generate HTML report
        $stressHtml = "$reportsDir/stress-tests_$timestamp.html"
        npx artillery report $stressReport --output $stressHtml
        Write-Host "📄 Report saved: $stressHtml" -ForegroundColor Cyan
    }
    else {
        Write-Host "❌ Stress tests failed" -ForegroundColor Red
    }
}
else {
    Write-Host "⏭️  Stress tests skipped" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🎉 Test Suite Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Reports generated in: $reportsDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review HTML reports in $reportsDir" -ForegroundColor White
Write-Host "  2. Check for performance bottlenecks" -ForegroundColor White
Write-Host "  3. Analyze error rates and response times" -ForegroundColor White
Write-Host "  4. Optimize slow endpoints" -ForegroundColor White
Write-Host ""

