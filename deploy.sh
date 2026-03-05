#!/bin/bash
# Railway deployment script for HomeCare Matching App
# This script deploys both backend and frontend services

set -e

PROJECT_ID="69f62dbf-df70-4c08-b168-95a7467dd29d"
REPO="dejavoo21/HomeCare-Matching-App"

echo "=========================================="
echo "Railway Deployment: HomeCare Matching App"
echo "=========================================="
echo ""

# Check if authenticated
if ! railway whoami > /dev/null 2>&1; then
    echo "Not authenticated. Please run 'railway login' first."
    exit 1
fi

echo "✓ Authenticated to Railway"

# Link project
echo ""
echo "Linking to project: $PROJECT_ID"
railway link "$PROJECT_ID"

# List current services
echo ""
echo "Current services:"
railway service list || true

echo ""
echo "========== Deployment Instructions =========="
echo ""
echo "The following steps need to be completed manually via Railway Dashboard:"
echo ""
echo "1. Visit: https://railway.com/project/$PROJECT_ID"
echo ""
echo "2. Click 'Add' button"
echo "3. Select 'GitHub Repository'"
echo "4. Choose repository: $REPO"
echo "5. In 'Root Directory': Enter: backend/"
echo "6. Click 'Create Service' and wait for deployment"
echo ""
echo "7. Repeat steps 2-6 for frontend with root directory: frontend/"
echo ""
echo "After services are deployed, you can verify with:"
echo "  railway service list"
echo ""
echo "========== Project Information =========="
echo "Project ID: $PROJECT_ID"
echo "Repository: https://github.com/$REPO"
echo "Dashboard: https://railway.com/project/$PROJECT_ID"
echo ""
