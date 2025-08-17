import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-change-this')
    
    # Check if demo mode is enabled
    DEMO_MODE = os.getenv('DEMO_MODE', 'false').lower() == 'true'
    
    if DEMO_MODE:
        # Use SQLite for demo mode
        SQLALCHEMY_DATABASE_URI = 'sqlite:///demo.db'
        print("🔧 Demo mode enabled - using SQLite database")
    else:
        # Use MySQL for production with complete configuration
        DB_USER = os.getenv('DB_USER', 'admin')
        DB_PASSWORD = os.getenv('DB_PASSWORD', 'lu8.Ilev<e:cD)S*Z2tUi2YtDCen')
        DB_WRITE_HOST = os.getenv('DB_WRITE_HOST', 'database-1.cluster-cjs8wgise5y9.ap-southeast-1.rds.amazonaws.com')
        DB_READ_HOST = os.getenv('DB_READ_HOST', 'database-1.cluster-ro-cjs8wgise5y9.ap-southeast-1.rds.amazonaws.com')
        DB_PORT = os.getenv('DB_PORT', '3306')
        DB_NAME = os.getenv('DB_NAME', 'NashathBooking')
        DB_SSL = os.getenv('DB_SSL', 'true')
        
        # Build MySQL connection string with all parameters
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_WRITE_HOST}:{DB_PORT}/{DB_NAME}?ssl_mode=REQUIRED"
        print("🌐 Production mode - using MySQL database")
        print(f"   Host: {DB_WRITE_HOST}")
        print(f"   Port: {DB_PORT}")
        print(f"   Database: {DB_NAME}")
        print(f"   SSL: {DB_SSL}")
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FLASK_ENV = os.getenv('FLASK_ENV', 'development') 