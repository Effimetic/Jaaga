#!/bin/bash

# Nashath Booking - Setup Script

echo "🚀 Setting up Nashath Booking for local development..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created!"
    echo ""
    echo "🔧 You can now edit the .env file to configure your database settings."
    echo "   For demo mode (no database required), set DEMO_MODE=true"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Install dependencies
echo "📦 Installing Python dependencies..."
python3 -m pip install -r requirements.txt

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file if needed"
echo "2. Run: python3 app.py"
echo "3. Open: http://localhost:8080"
echo ""
echo "💡 For demo mode (no database):"
echo "   Set DEMO_MODE=true in your .env file" 