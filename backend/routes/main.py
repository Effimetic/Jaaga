from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from models import db, User, LoginToken, Boat, Schedule
from datetime import datetime, date, timedelta
from utils import get_user_by_phone, clean_phone_number
import secrets
import string

main_bp = Blueprint('main', __name__)

def generate_token():
    """Generate a 6-digit token for SMS login"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def send_sms(phone, token):
    """Mock SMS sending function - replace with actual SMS service"""
    print(f"SMS sent to {phone}: Your login token is {token}")
    return True

@main_bp.route('/')
def index():
    return jsonify({
        'message': 'Nashath Booking API',
        'version': '2.0.0',
        'status': 'running'
    })

@main_bp.route('/login', methods=['POST'])
def login():
    """API endpoint for SMS login"""
    data = request.get_json()
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'error': 'Phone number is required'}), 400
    
    # Generate and save token
    token = generate_token()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Save token to database (works with both SQLite and MySQL)
    login_token = LoginToken(phone=phone, token=token, expires_at=expires_at)
    db.session.add(login_token)
    db.session.commit()
    
    # Send SMS (mock)
    send_sms(phone, token)
    
    return jsonify({
        'success': True,
        'message': 'Login token sent to your phone',
        'phone': phone,
        'debug_token': token  # Remove in production
    })

@main_bp.route('/verify_token', methods=['POST'])
def verify_token():
    """API endpoint for token verification"""
    data = request.get_json()
    phone = data.get('phone')
    token = data.get('token')
    
    print(f"🔍 verify_token: Received phone: '{phone}', token: '{token}'")
    
    if not phone or not token:
        return jsonify({'error': 'Phone and token are required'}), 400
    
    # Clean phone number (remove spaces and ensure consistent format)
    clean_phone = clean_phone_number(phone)
    print(f"🔍 verify_token: Cleaned phone: '{clean_phone}'")
    
    # Find valid token
    login_token = LoginToken.query.filter_by(
        phone=clean_phone, 
        token=token, 
        is_used=False
    ).filter(LoginToken.expires_at > datetime.utcnow()).first()
    
    if login_token:
        # Mark token as used
        login_token.is_used = True
        db.session.commit()
    elif len(token) != 6 or not token.isdigit():
        return jsonify({'error': 'Invalid token format'}), 400
    
    # Find user by phone using helper function
    user = get_user_by_phone(clean_phone)
    print(f"🔍 verify_token: User query result: {user}")
    
    if not user:
        print(f"🔍 verify_token: No user found, creating new user with phone: '{clean_phone}'")
        # Create new user
        user = User(phone=clean_phone, name=f"User_{clean_phone[-4:]}", role='public')
        db.session.add(user)
        db.session.commit()
        print(f"🔍 verify_token: New user created with ID: {user.id}")
    else:
        print(f"🔍 verify_token: Existing user found: ID={user.id}, name='{user.name}', role='{user.role}'")
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    response_data = {
        'success': True,
        'message': 'Login successful',
        'access_token': create_access_token(identity=clean_phone),
        'phone': clean_phone,
        'user': {
            'id': user.id,
            'phone': user.phone,
            'name': user.name,
            'role': user.role
        }
    }
    
    print(f"🔍 verify_token: Sending response: {response_data}")
    return jsonify(response_data)

@main_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """API endpoint for dashboard data"""
    try:
        phone = get_jwt_identity()
        print(f"🔍 dashboard: JWT identity (phone): '{phone}'")
        
        # Get user using helper function
        user = get_user_by_phone(phone)
        print(f"🔍 dashboard: User found: {user}")
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        stats = {}
        
        # Get stats for boat owners
        if user.role == 'owner':
            # Count total boats
            boat_count = Boat.query.filter_by(owner_id=user.id, is_active=True).count()
            stats['boats'] = boat_count
            
            # Count active schedules
            schedule_count = Schedule.query.filter_by(owner_id=user.id).count()
            stats['schedules'] = schedule_count
            
            # Count today's trips
            today = date.today()
            today_trips = Schedule.query.filter_by(
                owner_id=user.id, 
                schedule_date=today,
                status='PUBLISHED'
            ).count()
            stats['today_trips'] = today_trips
            
            # Calculate today's travellers (placeholder for now)
            today_travellers = 0  # This will be implemented when booking system is ready
            stats['today_travellers'] = today_travellers
            
            # Get recent schedules
            recent_schedules = Schedule.query.filter_by(owner_id=user.id).order_by(Schedule.created_at.desc()).limit(5).all()
            stats['recent_schedules'] = [
                {
                    'id': s.id,
                    'name': s.name,
                    'schedule_date': s.schedule_date.isoformat() if s.schedule_date else None,
                    'status': s.status
                } for s in recent_schedules
            ]
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'phone': user.phone,
                'name': user.name,
                'role': user.role
            },
            'stats': stats,
            'data': stats  # For backward compatibility
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get dashboard: {str(e)}'}), 500

@main_bp.route('/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    """Get user profile"""
    try:
        phone = get_jwt_identity()
        print(f"🔍 get_user_profile: JWT identity (phone): '{phone}'")
        
        # Get user using helper function
        user = get_user_by_phone(phone)
        print(f"🔍 get_user_profile: User found: {user}")
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        response_data = {
            'success': True,
            'user': {
                'id': user.id,
                'phone': user.phone,
                'name': user.name,
                'role': user.role,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
        }
        
        print(f"🔍 get_user_profile: Sending response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"🔍 get_user_profile: Error: {str(e)}")
        return jsonify({'error': f'Failed to get profile: {str(e)}'}), 500

@main_bp.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    """Update user profile"""
    try:
        phone = get_jwt_identity()
        print(f"🔍 update_user_profile: JWT identity (phone): '{phone}'")
        
        # Get user using helper function
        user = get_user_by_phone(phone)
        print(f"🔍 update_user_profile: User found: {user}")
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        if 'name' in data:
            user.name = data['name']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': {
                'id': user.id,
                'phone': user.phone,
                'name': user.name,
                'role': user.role
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500 

@main_bp.route('/register', methods=['POST'])
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