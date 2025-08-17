from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, date
from models.user import User, LoginToken
from models.boat_management import Boat
from models.scheduling import Schedule
from models import db
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
    
    if not phone or not token:
        return jsonify({'error': 'Phone and token are required'}), 400
    
    # Find valid token
    login_token = LoginToken.query.filter_by(
        phone=phone, 
        token=token, 
        is_used=False
    ).filter(LoginToken.expires_at > datetime.utcnow()).first()
    
    if login_token:
        # Mark token as used
        login_token.is_used = True
        db.session.commit()
    elif len(token) != 6 or not token.isdigit():
        return jsonify({'error': 'Invalid token format'}), 400
    
    # Find or create user
    user = User.query.filter_by(phone=phone).first()
    if not user:
        # Create new user
        user = User(phone=phone, name=f"User_{phone[-4:]}", role='public')
        db.session.add(user)
        db.session.commit()
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user': {
            'id': user.id,
            'phone': user.phone,
            'name': user.name,
            'role': user.role
        }
    })

@main_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    """API endpoint for dashboard data"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
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
        user = User.query.filter_by(phone=phone).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'phone': user.phone,
                'name': user.name,
                'role': user.role,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get profile: {str(e)}'}), 500

@main_bp.route('/user/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    """Update user profile"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
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