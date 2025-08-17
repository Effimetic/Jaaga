from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash, session
from flask_login import login_user, logout_user, login_required, current_user
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
    return render_template('index.html')

@main_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
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
        
        return jsonify({'message': 'Login token sent to your phone'})
    
    return render_template('login.html')

@main_bp.route('/verify_token', methods=['POST'])
def verify_token():
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
    
    # Log in user
    login_user(user)
    
    return jsonify({'message': 'Login successful', 'redirect': url_for('main.dashboard')})

@main_bp.route('/dashboard')
def dashboard():
    if current_user.is_authenticated:
        user = current_user
        stats = {}
        
        # Get stats for boat owners
        if user.role == 'owner':
            # Count total boats
            boat_count = Boat.query.filter_by(owner_id=user.id, is_active=True).count()
            
            # Count today's trips
            today = date.today()
            today_trips = Schedule.query.filter_by(
                owner_id=user.id, 
                schedule_date=today,
                status='active'
            ).count()
            
            # Calculate today's travellers (placeholder for now)
            today_travellers = 0  # This will be implemented when booking system is ready
            
            stats = {
                'boat_count': boat_count,
                'today_trips': today_trips,
                'today_travellers': today_travellers
            }
        
        return render_template('dashboard.html', user=user, **stats)
    elif 'demo_user' in session:
        return render_template('dashboard.html', user=session['demo_user'])
    else:
        return redirect(url_for('main.login'))

@main_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.index'))

@main_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        role = data.get('role', 'public')
        
        if not name or not phone:
            return jsonify({'error': 'Name and phone are required'}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(phone=phone).first()
        if existing_user:
            return jsonify({'error': 'User with this phone number already exists'}), 400
        
        # Create new user
        user = User(name=name, email=email, phone=phone, role=role)
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'message': 'Registration successful', 'redirect': url_for('main.login')})
    
    return render_template('register.html') 