#!/bin/bash

echo "🚀 Boat Ticketing App - Complete Deployment Script"
echo "=================================================="

# Make sure you're in the project directory
cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
echo -e "${BLUE}📋 Checking Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found!${NC}"
    echo "Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if you're logged in to Supabase
echo -e "${BLUE}📋 Checking Supabase login status...${NC}"
if ! supabase status &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Supabase!${NC}"
    echo "Please run:"
    echo "   supabase login"
    exit 1
fi
echo -e "${GREEN}✅ Logged in to Supabase${NC}"

# Check current project status
echo -e "${BLUE}📋 Checking project status...${NC}"
PROJECT_STATUS=$(supabase status 2>/dev/null)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to get project status${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Project status retrieved${NC}"

# Deploy SMS Edge Function
echo -e "${BLUE}📦 Deploying SMS Edge Function...${NC}"
echo "Function: send-sms-otp"
echo "Location: supabase/functions/send-sms-otp/"

if [ -d "supabase/functions/send-sms-otp" ]; then
    echo -e "${YELLOW}📤 Deploying send-sms-otp function...${NC}"
    
    # Deploy the function
    DEPLOY_OUTPUT=$(supabase functions deploy send-sms-otp 2>&1)
    DEPLOY_EXIT_CODE=$?
    
    if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ SMS Edge Function deployed successfully!${NC}"
        
        # Extract function URL from output
        FUNCTION_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^/]*\.supabase\.co/functions/v1/send-sms-otp' | head -1)
        if [ ! -z "$FUNCTION_URL" ]; then
            echo -e "${GREEN}🌐 Function URL: ${FUNCTION_URL}${NC}"
        fi
        
    else
        echo -e "${RED}❌ Failed to deploy SMS Edge Function${NC}"
        echo "Error output:"
        echo "$DEPLOY_OUTPUT"
        exit 1
    fi
else
    echo -e "${RED}❌ SMS Edge Function directory not found!${NC}"
    echo "Expected: supabase/functions/send-sms-otp/"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}💡 Next steps:${NC}"
echo "   1. Test your app - the SMS should now work!"
echo "   2. Check console logs for verification codes"
echo "   3. Later integrate with your real SMS service"
echo ""
echo -e "${BLUE}🔍 To test:${NC}"
echo "   1. Enter phone: 777-9186"
echo "   2. Click 'Send OTP'"
echo "   3. Watch console for generated code"
echo "   4. Enter any 6-digit code to test"
echo ""
echo -e "${BLUE}📁 Deployment files are in: deployment/ folder${NC}"
