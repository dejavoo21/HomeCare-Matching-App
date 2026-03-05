# Railway deployment script for HomeCare Matching App
# This script deploys backend and frontend services

$projectId = "69f62dbf-df70-4c08-b168-95a7467dd29d"
$repo = "dejavoo21/HomeCare-Matching-App"

Write-Host "=========================================="
Write-Host "Railway Deployment: HomeCare Matching App"
Write-Host "=========================================="
Write-Host ""

# Check authentication
Write-Host "Checking Railway authentication..."
$whoami = & railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not authenticated. Please login first." -ForegroundColor Red
    Write-Host "Run: railway login"
    exit 1
}

Write-Host "✓ Authenticated"
Write-Host ""

# Link project
Write-Host "Linking to Railway project..."
& railway link $projectId
Write-Host ""

# Deployment instructions for manual web UI method
Write-Host "========== MANUAL DEPLOYMENT STEPS ==========" -ForegroundColor Yellow
Write-Host ""
Write-Host "Complete these steps in the Railway Dashboard:"
Write-Host ""
Write-Host "1. Open: https://railway.com/project/$projectId"
Write-Host ""
Write-Host "DEPLOY BACKEND:"
Write-Host "  - Click 'Add' button in canvas"
Write-Host "  - Select 'GitHub Repository'"
Write-Host "  - Choose: $repo"
Write-Host "  - Root Directory: backend/"
Write-Host "  - Click 'Create Service'"
Write-Host "  - Wait for green ACTIVE status"
Write-Host ""
Write-Host "DEPLOY FRONTEND:"
Write-Host "  - Click 'Add' button in canvas"
Write-Host "  - Select 'GitHub Repository'"
Write-Host "  - Choose: $repo"
Write-Host "  - Root Directory: frontend/"
Write-Host "  - Click 'Create Service'"
Write-Host "  - Wait for green ACTIVE status"
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Project Dashboard: https://railway.com/project/$projectId"
Write-Host ""
