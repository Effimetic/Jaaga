#!/bin/bash

echo "🔍 Boat Ticketing App - Deployment Status Check"
echo "==============================================="

# Make sure you're in the project directory
cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo "Please install it first: npm install -g supabase"
    exit 1
fi

# Check if you're logged in to Supabase
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Supabase!${NC}"
    echo "Please run: supabase login"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI ready${NC}"

# Check project status
echo -e "${BLUE}📋 Project Status:${NC}"
supabase projects list

echo ""
echo -e "${BLUE}📁 Edge Functions Status:${NC}"

# Check if SMS function directory exists
if [ -d "supabase/functions/send-sms-otp" ]; then
    echo -e "${GREEN}✅ SMS Edge Function source found${NC}"
    echo "   Location: supabase/functions/send-sms-otp/"
    
    # Check if function is deployed
    echo -e "${BLUE}🔍 Checking deployment status...${NC}"
    
    # List deployed functions
    FUNCTIONS_OUTPUT=$(supabase functions list 2>&1)
    if echo "$FUNCTIONS_OUTPUT" | grep -q "send-sms-otp"; then
        echo -e "${GREEN}✅ SMS Edge Function is deployed${NC}"
    else
        echo -e "${YELLOW}⚠️  SMS Edge Function is NOT deployed${NC}"
        echo "   Run: ./deployment/deploy-all.sh"
    fi
else
    echo -e "${RED}❌ SMS Edge Function source not found${NC}"
fi

echo ""
echo -e "${BLUE}💡 Quick Actions:${NC}"
echo "   Deploy all: ./deployment/deploy-all.sh"
echo "   Check status: ./deployment/check-status.sh"
echo "   Test app: npm start"
