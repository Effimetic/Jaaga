from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import random
import string

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Load configuration
from config import Config
app.config.from_object(Config)

# Initialize extensions
from models import db
db.init_app(app)
jwt = JWTManager(app)
CORS(app)

# Import models
from models import *

# Import services
from services.sms_service import sms_service

# Import routes
from routes import main, boat_management, owner_settings, scheduling, unified_booking

# Global SMS codes storage (persistent between requests)
sms_codes = {}

@app.route('/api/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        role = data.get('role', 'public')
        
        if not name or not phone:
            return jsonify({'error': 'Name and phone are required'}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(phone=phone).first()
        if existing_user:
            return jsonify({'error': 'User with this phone number already exists'}), 400
        
        # Create new user
        user = User(
            name=name, 
            email=email if email else None, 
            phone=phone, 
            role=role
        )
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': {
                'id': user.id,
                'name': user.name,
                'phone': user.phone,
                'role': user.role
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

# Register blueprints
app.register_blueprint(main.main_bp, url_prefix='/api')
app.register_blueprint(boat_management.boat_bp, url_prefix='/api/boats')
app.register_blueprint(owner_settings.owner_settings_bp, url_prefix='/api/owner-settings')
app.register_blueprint(scheduling.scheduling_bp, url_prefix='/api/schedules')
app.register_blueprint(unified_booking.unified_booking_bp, url_prefix='/api/bookings')

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'Nashath Booking API',
        'version': '2.0.0'
    })

@app.route('/api/auth/send-sms', methods=['POST'])
def send_sms():
    """Send SMS with verification code"""
    try:
        data = request.get_json()
        phone = data.get('phone')
        
        print(f"📱 SEND SMS DEBUG:")
        print(f"   Received data: {data}")
        print(f"   Phone: {phone}")
        
        if not phone:
            print(f"   ❌ No phone number provided")
            return jsonify({'error': 'Phone number is required'}), 400
        
        # Generate 6-digit verification code
        verification_code = ''.join(random.choices(string.digits, k=6))
        print(f"   🔐 Generated code: {verification_code}")
        
        # Use SMS service to send the code
        sms_result = sms_service.send_verification_code(phone, verification_code)
        print(f"   📤 SMS service result: {sms_result}")
        
        if sms_result['success']:
            # Store the code temporarily (in production, use Redis or database)
            # For now, we'll store it in a simple way
            global sms_codes
            sms_codes[phone] = {
                'code': verification_code,
                'created_at': datetime.utcnow(),
                'attempts': 0
            }
            print(f"   💾 Stored code for {phone}: {sms_codes[phone]}")
            print(f"   📊 Total codes stored: {len(sms_codes)}")
            
            return jsonify({
                'success': True,
                'message': 'SMS sent successfully',
                'phone': phone,
                'debug_code': verification_code  # Remove this in production
            })
        else:
            print(f"   ❌ SMS service failed: {sms_result['message']}")
            return jsonify({'error': sms_result['message']}), 500
        
    except Exception as e:
        print(f"   ❌ Exception: {str(e)}")
        return jsonify({'error': f'Failed to send SMS: {str(e)}'}), 500

@app.route('/api/auth/verify-sms', methods=['POST'])
def verify_sms():
    """Verify SMS code and return JWT token"""
    try:
        data = request.get_json()
        phone = data.get('phone')
        code = data.get('code')
        
        print(f"🔍 VERIFY SMS DEBUG:")
        print(f"   Received data: {data}")
        print(f"   Phone: {phone}")
        print(f"   Code: {code}")
        print(f"   SMS codes in config: {sms_codes}")
        
        if not phone or not code:
            print(f"   ❌ Missing phone or code")
            return jsonify({'error': 'Phone number and verification code are required'}), 400
        
        # Check if code exists and is valid
        if phone not in sms_codes:
            print(f"   ❌ Phone {phone} not found in SMS codes")
            return jsonify({'error': 'Invalid phone number or code expired'}), 400
        
        code_data = sms_codes[phone]
        print(f"   📱 Found code data: {code_data}")
        
        # Check if code is correct
        if code_data['code'] != code:
            code_data['attempts'] += 1
            print(f"   ❌ Code mismatch. Expected: {code_data['code']}, Got: {code}")
            print(f"   ❌ Attempts: {code_data['attempts']}")
            if code_data['attempts'] >= 3:
                del sms_codes[phone]
                return jsonify({'error': 'Too many failed attempts. Please request a new code.'}), 400
            return jsonify({'error': 'Invalid verification code'}), 400
        
        # Check if code is expired (15 minutes)
        if datetime.utcnow() - code_data['created_at'] > timedelta(minutes=15):
            print(f"   ❌ Code expired. Created: {code_data['created_at']}")
            del sms_codes[phone]
            return jsonify({'error': 'Verification code expired. Please request a new one.'}), 400
        
        print(f"   ✅ Code verified successfully!")
        
        # Code is valid - create JWT token
        access_token = create_access_token(identity=phone)
        
        # Clean up the used code
        del sms_codes[phone]
        
        return jsonify({
            'success': True,
            'message': 'Verification successful',
            'access_token': access_token,
            'phone': phone
        })
        
    except Exception as e:
        print(f"   ❌ Exception: {str(e)}")
        return jsonify({'error': f'Failed to verify SMS: {str(e)}'}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get user profile using JWT token"""
    try:
        phone = get_jwt_identity()
        
        # Try to find user in database
        user = User.query.filter_by(phone=phone).first()
        
        if user:
            return jsonify({
                'success': True,
                'profile': {
                    'id': user.id,
                    'phone': user.phone,
                    'name': user.name,
                    'role': user.role,
                    'authenticated': True,
                    'timestamp': datetime.utcnow().isoformat()
                }
            })
        else:
            # Return basic profile for new users
            return jsonify({
                'success': True,
                'profile': {
                    'phone': phone,
                    'authenticated': True,
                    'new_user': True,
                    'timestamp': datetime.utcnow().isoformat()
                }
            })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get profile: {str(e)}'}), 500

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (in production, blacklist JWT token)"""
    try:
        # In production, add token to blacklist
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to logout: {str(e)}'}), 500

@app.route('/api/status', methods=['GET'])
def api_status():
    """API status and available endpoints"""
    return jsonify({
        'status': 'running',
        'version': '2.0.0',
        'timestamp': datetime.utcnow().isoformat(),
        'endpoints': {
            'auth': {
                'send_sms': 'POST /api/auth/send-sms',
                'verify_sms': 'POST /api/auth/verify-sms',
                'profile': 'GET /api/auth/profile',
                'logout': 'POST /api/auth/logout'
            },
            'boats': 'GET /api/boats/*',
            'schedules': 'GET /api/schedules/*',
            'bookings': 'GET /api/bookings/*',
            'owner_settings': 'GET /api/owner-settings/*'
        }
    })

if __name__ == '__main__':
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
            print("✅ Database tables created successfully!")
        except Exception as e:
            print(f"⚠️ Database setup warning: {e}")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
