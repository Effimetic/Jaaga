#!/bin/bash

# Nashath Booking - Deployment Script for AWS App Runner

echo "🚀 Deploying Nashath Booking to AWS App Runner..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - Nashath Booking Speed Boat Ticketing System"
fi

# Check if remote is configured
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "⚠️  No remote repository configured."
    echo "Please add your remote repository:"
    echo "git remote add origin <your-repo-url>"
    echo "git push -u origin main"
    exit 1
fi

# Push to remote repository
echo "📤 Pushing to remote repository..."
git add .
git commit -m "Update: $(date)"
git push origin main

echo "✅ Code pushed successfully!"
echo ""
echo "📋 Next steps for AWS App Runner deployment:"
echo "1. Go to AWS App Runner console"
echo "2. Create new service"
echo "3. Connect your Git repository"
echo "4. Use the apprunner.yaml configuration"
echo "5. Deploy the service"
echo ""
echo "🌐 Your application will be available at the provided App Runner URL" 