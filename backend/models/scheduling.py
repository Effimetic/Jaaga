from datetime import datetime, date, time
from sqlalchemy.orm import relationship
from models import db
from flask_login import UserMixin

class Island(db.Model):
    """Island destinations"""
    __tablename__ = 'islands'
    
    id = db.Column(db.Integer, primary_key=True)
    atoll = db.Column(db.String(10), nullable=False)  # e.g., "HA", "AA", "Male"
    name = db.Column(db.String(100), nullable=False)
    alt_name = db.Column(db.String(100), nullable=True)
    latitude = db.Column(db.String(20), nullable=True)
    longitude = db.Column(db.String(20), nullable=True)
    flags = db.Column(db.String(50), nullable=True)  # Store as comma-separated values
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Composite unique constraint
    __table_args__ = (db.UniqueConstraint('atoll', 'name', name='_atoll_name_uc'),)

class Destination(db.Model):
    """Popular destinations for auto-fill and front page"""
    __tablename__ = 'destinations'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)  # Only island name, not routes
    is_popular = db.Column(db.Boolean, default=False)
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Schedule(db.Model):
    """Boat schedules"""
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    boat_id = db.Column(db.Integer, db.ForeignKey('boat.id'), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    schedule_date = db.Column(db.Date, nullable=False)
    total_seats = db.Column(db.Integer, nullable=False)
    available_seats = db.Column(db.Integer, nullable=False)
    
    # Booking Configuration
    confirmation_type = db.Column(db.String(20), default='immediate')  # immediate, manual
    is_public = db.Column(db.Boolean, default=True)
    
    # Status
    status = db.Column(db.String(20), default='DRAFT')  # DRAFT, PUBLISHED, CANCELLED, COMPLETED
    
    # Unified Booking System
    tax_profile_id = db.Column(db.Integer, db.ForeignKey('tax_profiles.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    boat = db.relationship('Boat', backref='schedules')
    owner = db.relationship('User', backref='schedules')
    destinations = db.relationship('ScheduleDestination', backref='schedule', cascade='all, delete-orphan')
    seats = db.relationship('ScheduleSeat', backref='schedule', cascade='all, delete-orphan')
    # Legacy relationship - will be replaced by unified bookings
    bookings = db.relationship('OwnerBooking', backref='schedule', cascade='all, delete-orphan')
    
    # Unified Booking System relationships
    tax_profile = db.relationship('TaxProfile', backref='schedules')

class ScheduleDestination(db.Model):
    """Destinations for each schedule"""
    __tablename__ = 'schedule_destinations'
    
    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=False)
    island_name = db.Column(db.String(100), nullable=False)
    sequence_order = db.Column(db.Integer, nullable=False)
    departure_time = db.Column(db.Time, nullable=True)
    arrival_time = db.Column(db.Time, nullable=True)
    is_pickup = db.Column(db.Boolean, default=True)
    is_dropoff = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ScheduleSeat(db.Model):
    """Seat management for schedules"""
    __tablename__ = 'schedule_seats'
    
    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=False)
    seat_number = db.Column(db.String(10), nullable=False)
    is_blocked = db.Column(db.Boolean, default=False)
    reason = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow) 


class OwnerBooking(db.Model):
    """Owner-side seat bookings for schedules"""
    __tablename__ = 'owner_bookings'

    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    agent_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    booking_ref = db.Column(db.String(30), nullable=False, unique=True)
    customer_type = db.Column(db.String(10), nullable=False)  # 'public' or 'agent'
    price_type = db.Column(db.String(15), nullable=False)  # 'priced' or 'complimentary'
    total_amount = db.Column(db.Numeric(10, 2), nullable=False, default=0)
    currency = db.Column(db.String(3), default='MVR')
    contact_phone = db.Column(db.String(20), nullable=True)
    contact_name = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_id], backref='owner_bookings')
    agent = db.relationship('User', foreign_keys=[agent_id])
    seats = db.relationship('OwnerBookingSeat', backref='booking', cascade='all, delete-orphan')


class OwnerBookingSeat(db.Model):
    __tablename__ = 'owner_booking_seats'

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('owner_bookings.id'), nullable=False)
    seat_number = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)