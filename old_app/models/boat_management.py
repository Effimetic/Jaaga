from datetime import datetime
from sqlalchemy.orm import relationship
from models import db

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
    owner = relationship('User', backref='boats')

class Seat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    boat_id = db.Column(db.Integer, db.ForeignKey('boat.id'), nullable=False)
    seat_number = db.Column(db.String(10), nullable=False)  # e.g., "A1", "A2", "1", "2"
    is_held = db.Column(db.Boolean, default=False)
    is_reserved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    boat = relationship('Boat', backref='seats') 