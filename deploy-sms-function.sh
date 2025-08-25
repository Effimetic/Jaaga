#!/bin/bash

echo "🚀 Deploying SMS Edge Function to Supabase..."

# Make sure you're in the project directory
cd "$(dirname "$0")"

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if you're logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

# Deploy the function
echo "📦 Deploying send-sms-otp function..."
supabase functions deploy send-sms-otp

if [ $? -eq 0 ]; then
    echo "✅ SMS Edge Function deployed successfully!"
    echo "🌐 Function URL: https://your-project.supabase.co/functions/v1/send-sms-otp"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Test the function with your app"
    echo "   2. Later integrate with your SMS service"
    echo "   3. Implement proper verification storage"
else
    echo "❌ Failed to deploy SMS Edge Function"
    exit 1
fi
