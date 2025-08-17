from datetime import datetime
from sqlalchemy.orm import relationship
from models import db
from flask_login import UserMixin
from decimal import Decimal
import random
import string

class TicketType(db.Model):
    """Ticket types defined by boat owners"""
    __tablename__ = 'ticket_types'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)  # e.g., "ECO", "VIP", "Child"
    code = db.Column(db.String(10), nullable=False, unique=True)  # e.g., "ECO", "VIP"
    base_price = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='MVR')
    refundable = db.Column(db.Boolean, default=True)
    baggage_rules = db.Column(db.JSON, default={})
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = db.relationship('User', backref='ticket_types')
    
    def __repr__(self):
        return f'<TicketType {self.code}: {self.name}>'


class TaxProfile(db.Model):
    """Tax profiles for schedules"""
    __tablename__ = 'tax_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)  # e.g., "Domestic VAT 8% + Green Tax"
    lines = db.Column(db.JSON, nullable=False)  # Array of tax lines
    rounding_rule = db.Column(db.String(20), default='ROUND_UP')  # ROUND_UP, ROUND_DOWN, ROUND_NEAREST
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = db.relationship('User', backref='tax_profiles')
    
    def calculate_tax(self, base_amount):
        """Calculate tax based on profile lines"""
        total_tax = Decimal('0')
        for line in self.lines:
            if not line.get('active', True):
                continue
                
            tax_type = line.get('type', 'PERCENT')
            value = Decimal(str(line.get('value', 0)))
            applies_to = line.get('applies_to', 'FARE')
            
            if tax_type == 'PERCENT':
                if applies_to == 'FARE':
                    tax_amount = base_amount * (value / Decimal('100'))
                else:  # TOTAL
                    tax_amount = (base_amount + total_tax) * (value / Decimal('100'))
            else:  # FIXED
                tax_amount = value
            
            total_tax += tax_amount
        
        # Apply rounding rule
        if self.rounding_rule == 'ROUND_UP':
            total_tax = total_tax.quantize(Decimal('0.01'), rounding='ROUND_UP')
        elif self.rounding_rule == 'ROUND_DOWN':
            total_tax = total_tax.quantize(Decimal('0.01'), rounding='ROUND_DOWN')
        else:  # ROUND_NEAREST
            total_tax = total_tax.quantize(Decimal('0.01'), rounding='ROUND_HALF_UP')
        
        return total_tax


class ScheduleTicketType(db.Model):
    """Many-to-many relationship between schedules and ticket types"""
    __tablename__ = 'schedule_ticket_types'
    
    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=False)
    ticket_type_id = db.Column(db.Integer, db.ForeignKey('ticket_types.id'), nullable=False)
    surcharge = db.Column(db.Numeric(10, 2), default=0)  # Schedule-level modifier
    discount = db.Column(db.Numeric(10, 2), default=0)   # Schedule-level modifier
    channel = db.Column(db.String(20), default='PUBLIC')  # PUBLIC, AGENT, BOTH
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    schedule = db.relationship('Schedule', backref='schedule_ticket_types')
    ticket_type = db.relationship('TicketType')


class Booking(db.Model):
    """Unified booking model for all channels"""
    __tablename__ = 'bookings'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(6), nullable=False, unique=True)  # 6-char alphanumeric
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=False)
    channel = db.Column(db.String(20), nullable=False)  # PUBLIC, AGENT, OWNER
    
    # Creator information
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    agent_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    # Buyer information
    buyer_name = db.Column(db.String(200), nullable=False)
    buyer_phone = db.Column(db.String(20), nullable=False)
    buyer_national_id = db.Column(db.String(50), nullable=True)
    
    # Route information
    pickup_destination_id = db.Column(db.Integer, db.ForeignKey('schedule_destinations.id'), nullable=False)
    dropoff_destination_id = db.Column(db.Integer, db.ForeignKey('schedule_destinations.id'), nullable=False)
    departure_time = db.Column(db.DateTime, nullable=True)  # Actual departure time for selected route segment
    
    # Financial information
    line_items = db.Column(db.JSON, nullable=False)  # Detailed breakdown
    subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    tax_total = db.Column(db.Numeric(10, 2), nullable=False)
    discount_total = db.Column(db.Numeric(10, 2), nullable=False)
    grand_total = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='MVR')
    
    # Status
    payment_status = db.Column(db.String(20), default='PENDING')  # PENDING, PAID, PARTIAL, FAILED, REFUNDED
    fulfillment_status = db.Column(db.String(20), default='UNCONFIRMED')  # UNCONFIRMED, CONFIRMED, CHECKED_IN, BOARDED, CANCELLED
    finance_status = db.Column(db.String(20), default='UNPOSTED')  # UNPOSTED, POSTED, ADJUSTED, REVERSED
    
    # Metadata
    meta = db.Column(db.JSON, default={})  # Audit, request source, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_id], backref='unified_bookings')
    schedule = db.relationship('Schedule', backref='unified_bookings')
    created_by = db.relationship('User', foreign_keys=[created_by_user_id])
    agent = db.relationship('User', foreign_keys=[agent_id])
    pickup_destination = db.relationship('ScheduleDestination', foreign_keys=[pickup_destination_id])
    dropoff_destination = db.relationship('ScheduleDestination', foreign_keys=[dropoff_destination_id])
    tickets = db.relationship('BookingTicket', backref='booking', cascade='all, delete-orphan')
    seat_assignments = db.relationship('SeatAssignment', backref='booking', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Booking {self.code}: {self.buyer_name}>'
    
    @staticmethod
    def generate_code():
        """Generate unique 6-char alphanumeric code (excluding O, I)"""
        chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
        while True:
            code = ''.join(random.choices(chars, k=6))
            if not Booking.query.filter_by(code=code).first():
                return code


class BookingTicket(db.Model):
    """Individual tickets within a booking"""
    __tablename__ = 'booking_tickets'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    ticket_type_id = db.Column(db.Integer, db.ForeignKey('ticket_types.id'), nullable=False)
    passenger_name = db.Column(db.String(200), nullable=False)
    passenger_phone = db.Column(db.String(20), nullable=True)
    fare_base_price_snapshot = db.Column(db.Numeric(10, 2), nullable=False)  # Price at time of booking
    seat_no = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    ticket_type = db.relationship('TicketType')


class SeatAssignment(db.Model):
    """Seat assignments for tickets"""
    __tablename__ = 'seat_assignments'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    ticket_id = db.Column(db.Integer, db.ForeignKey('booking_tickets.id'), nullable=False)
    seat_no = db.Column(db.String(10), nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    assigned_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    travel_status = db.Column(db.String(20), default='ACTIVE')  # ACTIVE, TRAVELLED, CANCELLED
    travelled_at = db.Column(db.DateTime, nullable=True)
    travelled_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    meta = db.Column(db.JSON, default={})  # Additional metadata
    
    # Relationships
    assigned_by_user = db.relationship('User', foreign_keys=[assigned_by])
    travelled_by_user = db.relationship('User', foreign_keys=[travelled_by_user_id])


# AppOwnerSettings is already defined in owner_settings.py


class LedgerAccount(db.Model):
    """Chart of accounts for multi-tenant system"""
    __tablename__ = 'ledger_accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Null for global accounts
    entity_type = db.Column(db.String(20), nullable=False)  # APP_OWNER, BOAT_OWNER, AGENT, SYSTEM
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), nullable=False, unique=True)
    type = db.Column(db.String(20), nullable=False)  # ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    currency = db.Column(db.String(3), default='MVR')
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_id])


class LedgerEntry(db.Model):
    """Journal header for accounting entries"""
    __tablename__ = 'ledger_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=True)
    posted_at = db.Column(db.DateTime, default=datetime.utcnow)
    memo = db.Column(db.String(500), nullable=False)
    source = db.Column(db.String(20), nullable=False)  # BOOKING, PAYMENT, REFUND, ADJUSTMENT, SETTLEMENT
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    booking = db.relationship('Booking', foreign_keys=[booking_id])
    schedule = db.relationship('Schedule', foreign_keys=[schedule_id])
    lines = db.relationship('LedgerLine', backref='entry', cascade='all, delete-orphan')


class LedgerLine(db.Model):
    """Individual ledger line items"""
    __tablename__ = 'ledger_lines'
    
    id = db.Column(db.Integer, primary_key=True)
    entry_id = db.Column(db.Integer, db.ForeignKey('ledger_entries.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('ledger_accounts.id'), nullable=False)
    debit = db.Column(db.Numeric(10, 2), default=0)
    credit = db.Column(db.Numeric(10, 2), default=0)
    meta = db.Column(db.JSON, default={})  # e.g., ticket_id, tax_line_id
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    account = db.relationship('LedgerAccount')


class ReceivableSnapshot(db.Model):
    """Snapshot of receivables for reporting"""
    __tablename__ = 'receivable_snapshots'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey('bookings.id'), nullable=False)
    agent_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    party = db.Column(db.String(20), nullable=False)  # AGENT, PUBLIC
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='MVR')
    status = db.Column(db.String(20), default='OPEN')  # OPEN, PARTIAL, CLOSED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    booking = db.relationship('Booking', foreign_keys=[booking_id])
    agent = db.relationship('User', foreign_keys=[agent_id])


class SettlementStatement(db.Model):
    """Settlement statements between parties"""
    __tablename__ = 'settlement_statements'
    
    id = db.Column(db.Integer, primary_key=True)
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date, nullable=False)
    party_from = db.Column(db.String(20), nullable=False)  # BOAT_OWNER, AGENT
    party_to = db.Column(db.String(20), nullable=False)   # APP_OWNER, BOAT_OWNER
    party_from_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    party_to_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    opening_balance = db.Column(db.Numeric(10, 2), default=0)
    debits = db.Column(db.Numeric(10, 2), default=0)
    credits = db.Column(db.Numeric(10, 2), default=0)
    closing_balance = db.Column(db.Numeric(10, 2), default=0)
    status = db.Column(db.String(20), default='DRAFT')  # DRAFT, ISSUED, PAID, RECONCILED
    pdf_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    party_from_user = db.relationship('User', foreign_keys=[party_from_id])
    party_to_user = db.relationship('User', foreign_keys=[party_to_id])
