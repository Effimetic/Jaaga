from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, timedelta
import jwt
import secrets
import string
from dotenv import load_dotenv

from config import Config

app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Database Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(20), default='public')  # public, agent, owner, admin
    credit_balance = db.Column(db.Float, default=0.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class LoginToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(20), nullable=False)
    token = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Boat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    seating_type = db.Column(db.String(20), default='total')  # 'total' or 'chart'
    total_seats = db.Column(db.Integer, nullable=False)
    seating_chart = db.Column(db.Text)  # JSON string for seat chart
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    owner = db.relationship('User', backref='boats')

class Seat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    boat_id = db.Column(db.Integer, db.ForeignKey('boat.id'), nullable=False)
    seat_number = db.Column(db.String(10), nullable=False)  # e.g., "A1", "A2", "1", "2"
    is_held = db.Column(db.Boolean, default=False)
    is_reserved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    boat = db.relationship('Boat', backref='seats')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def generate_token():
    """Generate a 6-digit token for SMS login"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def send_sms(phone, token):
    """Mock SMS sending function - replace with actual SMS service"""
    print(f"SMS sent to {phone}: Your login token is {token}")
    return True

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
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

@app.route('/verify_token', methods=['POST'])
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
    
    return jsonify({'message': 'Login successful', 'redirect': url_for('dashboard')})

@app.route('/dashboard')
def dashboard():
    if current_user.is_authenticated:
        return render_template('dashboard.html', user=current_user)
    elif 'demo_user' in session:
        return render_template('dashboard.html', user=session['demo_user'])
    else:
        return redirect(url_for('login'))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/register', methods=['GET', 'POST'])
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
        
        return jsonify({'message': 'Registration successful', 'redirect': url_for('login')})
    
    return render_template('register.html')

# Boat Management Routes
@app.route('/boats')
@login_required
def boats():
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can manage boats.', 'error')
        return redirect(url_for('dashboard'))
    
    user_boats = Boat.query.filter_by(owner_id=current_user.id).all()
    return render_template('boats.html', boats=user_boats)

@app.route('/boats/add', methods=['GET', 'POST'])
@login_required
def add_boat():
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied. Only boat owners can add boats.'}), 403
    
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        seating_type = data.get('seating_type', 'total')
        total_seats = data.get('total_seats')
        seating_chart = data.get('seating_chart')
        
        if not name or not total_seats:
            return jsonify({'error': 'Boat name and total seats are required'}), 400
        
        try:
            boat = Boat(
                name=name,
                owner_id=current_user.id,
                seating_type=seating_type,
                total_seats=total_seats,
                seating_chart=seating_chart
            )
            db.session.add(boat)
            db.session.commit()
            
            # Create seats based on seating type
            if seating_type == 'chart' and seating_chart:
                # Parse seating chart and create individual seats
                import json
                chart_data = json.loads(seating_chart)
                
                # Handle new grid-based format
                if 'seatChartData' in chart_data:
                    # New grid-based format
                    seat_chart_data = chart_data['seatChartData']
                    for row in seat_chart_data:
                        for seat in row:
                            if seat.get('number') and not seat.get('isWalkway', False):
                                seat_obj = Seat(
                                    boat_id=boat.id,
                                    seat_number=seat['number']
                                )
                                db.session.add(seat_obj)
                else:
                    # Legacy format
                    for row in chart_data:
                        for seat in row:
                            if seat.get('number'):
                                seat_obj = Seat(
                                    boat_id=boat.id,
                                    seat_number=seat['number']
                                )
                                db.session.add(seat_obj)
            else:
                # Create numbered seats (1, 2, 3, etc.)
                for i in range(1, total_seats + 1):
                    seat = Seat(
                        boat_id=boat.id,
                        seat_number=str(i)
                    )
                    db.session.add(seat)
            
            db.session.commit()
            return jsonify({'message': 'Boat added successfully', 'redirect': url_for('boats')})
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to add boat: {str(e)}'}), 500
    
    return render_template('add_boat.html')

@app.route('/boats/<int:boat_id>')
@login_required
def view_boat(boat_id):
    boat = Boat.query.get_or_404(boat_id)
    if boat.owner_id != current_user.id:
        flash('Access denied.', 'error')
        return redirect(url_for('boats'))
    
    return render_template('view_boat.html', boat=boat)

@app.route('/boats/<int:boat_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_boat(boat_id):
    boat = Boat.query.get_or_404(boat_id)
    if boat.owner_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        seating_type = data.get('seating_type')
        total_seats = data.get('total_seats')
        seating_chart = data.get('seating_chart')
        
        if not name or not total_seats:
            return jsonify({'error': 'Boat name and total seats are required'}), 400
        
        try:
            boat.name = name
            boat.seating_type = seating_type
            boat.total_seats = total_seats
            boat.seating_chart = seating_chart
            boat.updated_at = datetime.utcnow()
            
            db.session.commit()
            return jsonify({'message': 'Boat updated successfully', 'redirect': url_for('boats')})
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to update boat: {str(e)}'}), 500
    
    return render_template('edit_boat.html', boat=boat)

@app.route('/boats/<int:boat_id>/delete', methods=['POST'])
@login_required
def delete_boat(boat_id):
    boat = Boat.query.get_or_404(boat_id)
    if boat.owner_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    
    try:
        # Delete associated seats first
        Seat.query.filter_by(boat_id=boat.id).delete()
        db.session.delete(boat)
        db.session.commit()
        return jsonify({'message': 'Boat deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete boat: {str(e)}'}), 500

if __name__ == '__main__':
    try:
        with app.app_context():
            db.create_all()
        print("✅ Database tables created successfully!")
    except Exception as e:
        print(f"⚠️  Database connection failed: {e}")
        print("📝 Running in demo mode - some features may not work")
    
    app.run(debug=True, host='0.0.0.0', port=8080) 