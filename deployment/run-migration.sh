#!/bin/bash

echo "🗄️  Running Database Migration"
echo "=============================="

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
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Supabase!${NC}"
    echo "Please run:"
    echo "   supabase login"
    exit 1
fi
echo -e "${GREEN}✅ Logged in to Supabase${NC}"

# Run the migration
echo -e "${BLUE}📦 Running migration: update-schedule-templates-schema.sql${NC}"

# Get the project ID from supabase config
PROJECT_ID=$(supabase projects list --json | jq -r '.[0].id' 2>/dev/null)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
    echo -e "${RED}❌ Could not determine project ID${NC}"
    exit 1
fi

echo -e "${YELLOW}📤 Running migration on project: ${PROJECT_ID}${NC}"

# Run the SQL migration
MIGRATION_OUTPUT=$(supabase db push --include-all 2>&1)
MIGRATION_EXIT_CODE=$?

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}💡 Migration Summary:${NC}"
    echo "   - Added ticket_type_configs column to schedule_templates"
    echo "   - Updated existing templates with default values"
else
    echo -e "${RED}❌ Migration failed${NC}"
    echo "Error output:"
    echo "$MIGRATION_OUTPUT"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Migration completed!${NC}"
echo -e "${BLUE}📁 Template functionality is now enhanced with:${NC}"
echo "   - Ticket type configurations"
echo "   - Complete template loading and saving"
