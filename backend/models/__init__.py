from flask_sqlalchemy import SQLAlchemy

# Create a single SQLAlchemy instance to be shared across all models
db = SQLAlchemy()

# Import all models to ensure they are registered with SQLAlchemy
from .user import User, LoginToken
from .boat_management import Boat
from .scheduling import Schedule, ScheduleDestination, ScheduleSeat, Island, Destination, OwnerBooking, OwnerBookingSeat
from .owner_settings import OwnerSettings, StaffUser, PaymentTransaction, AppOwnerSettings, CommissionLedger, OwnerAgentConnection
from .unified_booking import (
    TicketType, TaxProfile, ScheduleTicketType, Booking, BookingTicket, 
    SeatAssignment, LedgerAccount, LedgerEntry, LedgerLine, 
    ReceivableSnapshot, SettlementStatement
)

__all__ = [
    'db',
    'User', 'LoginToken', 'Boat', 'Schedule', 'ScheduleDestination', 'ScheduleSeat', 
    'Island', 'Destination', 'OwnerBooking', 'OwnerBookingSeat', 
    'OwnerAgentConnection', 'OwnerSettings', 'StaffUser', 'PaymentTransaction', 
    'AppOwnerSettings', 'CommissionLedger', 'TicketType', 'TaxProfile', 
    'ScheduleTicketType', 'Booking', 'BookingTicket', 'SeatAssignment', 
    'LedgerAccount', 'LedgerEntry', 'LedgerLine', 'ReceivableSnapshot', 
    'SettlementStatement'
] 