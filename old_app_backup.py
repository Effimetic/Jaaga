from flask import Flask
from flask_login import LoginManager
from config import Config
import os
import json

# Import models
from models import db
from models.user import User
from models.boat_management import Boat, Seat
from models.scheduling import Schedule, ScheduleDestination, ScheduleSeat, Island, Destination
from models.owner_settings import OwnerSettings, PaymentTransaction, StaffUser

# Import routes
from routes.main import main_bp
from routes.boat_management import boat_bp
from routes.scheduling import scheduling_bp
from routes.owner_settings import owner_settings_bp
from routes.unified_booking import unified_booking_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize database
    db.init_app(app)
    
    # Initialize login manager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(boat_bp, url_prefix='/boats')
    app.register_blueprint(scheduling_bp, url_prefix='/schedules')
    app.register_blueprint(owner_settings_bp, url_prefix='/owner')
    app.register_blueprint(unified_booking_bp, url_prefix='/api')
    
    return app

def load_islands_from_json():
    """Load islands from the JSON file"""
    try:
        json_path = os.path.join(os.path.dirname(__file__), 'data', 'atoll-islands-atollsofmaldives.json')
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        islands = []
        for atoll_code, atoll_islands in data.items():
            for island_data in atoll_islands:
                if island_data.get('type') == 'Islands':
                    islands.append({
                        'atoll': atoll_code,
                        'name': island_data['name'],
                        'alt_name': island_data.get('alt_name'),
                        'latitude': island_data.get('latitude'),
                        'longitude': island_data.get('longitude'),
                        'flags': ','.join(island_data.get('flags', [])) if island_data.get('flags') else None
                    })
        return islands
    except Exception as e:
        print(f"⚠️  Failed to load islands from JSON: {e}")
        return []

if __name__ == '__main__':
    app = create_app()
    
    try:
        with app.app_context():
            # Create all database tables
            db.create_all()
            
            # Load islands from JSON file
            islands_data = load_islands_from_json()
            
            if islands_data:
                # Initialize islands from JSON
                for island_data in islands_data:
                    existing = Island.query.filter_by(
                        atoll=island_data['atoll'], 
                        name=island_data['name']
                    ).first()
                    if not existing:
                        island = Island(**island_data)
                        db.session.add(island)
                
                db.session.commit()
                print(f"✅ {len(islands_data)} islands loaded from JSON!")
            else:
                # Fallback to default islands if JSON loading fails
                default_islands = [
                    {'atoll': 'Male', 'name': 'Male'},
                    {'atoll': 'Male', 'name': 'Hulhumale'},
                    {'atoll': 'Male', 'name': 'Villimale'},
                    {'atoll': 'Kaafu', 'name': 'Maafushi'},
                    {'atoll': 'Kaafu', 'name': 'Gulhi'},
                    {'atoll': 'Kaafu', 'name': 'Thulusdhoo'},
                    {'atoll': 'Kaafu', 'name': 'Huraa'},
                    {'atoll': 'Kaafu', 'name': 'Dhiffushi'},
                    {'atoll': 'Kaafu', 'name': 'Guraidhoo'},
                    {'atoll': 'Kaafu', 'name': 'Kaashidhoo'},
                ]
                
                for island_data in default_islands:
                    existing = Island.query.filter_by(
                        atoll=island_data['atoll'], 
                        name=island_data['name']
                    ).first()
                    if not existing:
                        island = Island(**island_data)
                        db.session.add(island)
                
                db.session.commit()
                print("✅ Default islands initialized!")
        
        print("✅ Database tables created successfully!")
    except Exception as e:
        print(f"⚠️  Database connection failed: {e}")
        print("📝 Running in demo mode - some features may not work")
    
    app.run(debug=True, host='0.0.0.0', port=8080) 