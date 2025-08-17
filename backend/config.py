import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-jwt-secret-key-here')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Check if demo mode is enabled
    DEMO_MODE = os.getenv('DEMO_MODE', 'true').lower() == 'true'
    
    if DEMO_MODE:
        # Use SQLite for demo mode
        SQLALCHEMY_DATABASE_URI = 'sqlite:///nashath_booking.db'
        print("🔧 Demo mode enabled - using SQLite database")
    else:
        # Use database URL from environment
        SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///nashath_booking.db')
        print("🌐 Production mode - using configured database")
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')

from datetime import timedelta