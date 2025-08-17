from datetime import datetime
from decimal import Decimal
from models.unified_booking import (
    Booking, BookingTicket, SeatAssignment, TicketType, 
    ScheduleTicketType, TaxProfile
)
from models.scheduling import Schedule
from models.owner_settings import AppOwnerSettings
from models import db
from services.pricing_engine import PricingEngine
import json

class UnifiedBookingService:
    """Unified booking service for all channels"""
    
    def __init__(self, owner_id, schedule_id):
        self.owner_id = owner_id
        self.schedule_id = schedule_id
        self.pricing_engine = PricingEngine(owner_id, schedule_id)
    
    def create_booking(self, booking_data):
        """
        Create a new booking
        
        Args:
            booking_data: dict with booking information
            
        Returns:
            Booking object
        """
        try:
            # Validate ticket types
            ticket_type_ids = [ticket['ticket_type_id'] for ticket in booking_data['tickets']]
            if not self.pricing_engine.validate_ticket_types(ticket_type_ids):
                raise ValueError("Invalid ticket types for this schedule")
            
            # Calculate pricing
            ticket_requests = [
                {'ticket_type_id': ticket['ticket_type_id'], 'quantity': 1}
                for ticket in booking_data['tickets']
            ]
            
            pricing = self.pricing_engine.calculate_booking_price(
                ticket_requests,
                channel=booking_data['channel'],
                agent_id=booking_data.get('agent_id')
            )
            
            # Generate unique booking code
            booking_code = Booking.generate_code()
            
            # Create booking
            booking = Booking(
                code=booking_code,
                owner_id=self.owner_id,
                schedule_id=self.schedule_id,
                channel=booking_data['channel'],
                created_by_user_id=booking_data.get('created_by_user_id'),
                agent_id=booking_data.get('agent_id'),
                buyer_name=booking_data['buyer_name'],
                buyer_phone=booking_data['buyer_phone'],
                buyer_national_id=booking_data.get('buyer_national_id'),
                line_items=json.dumps(pricing['line_items']),
                subtotal=pricing['subtotal'],
                tax_total=pricing['tax_total'],
                discount_total=pricing['discount_total'],
                grand_total=pricing['grand_total'],
                currency=pricing['currency'],
                payment_status='PENDING',
                fulfillment_status='UNCONFIRMED',
                finance_status='UNPOSTED',
                meta=json.dumps(booking_data.get('meta', {}))
            )
            
            db.session.add(booking)
            db.session.flush()  # Get booking ID
            
            # Create booking tickets
            for i, ticket_data in enumerate(booking_data['tickets']):
                ticket_type = TicketType.query.get(ticket_data['ticket_type_id'])
                
                booking_ticket = BookingTicket(
                    booking_id=booking.id,
                    ticket_type_id=ticket_data['ticket_type_id'],
                    passenger_name=ticket_data['passenger_name'],
                    passenger_phone=ticket_data.get('passenger_phone'),
                    fare_base_price_snapshot=ticket_type.base_price
                )
                
                db.session.add(booking_ticket)
                db.session.flush()  # Get ticket ID
                
                # Assign seat if provided
                if ticket_data.get('seat_no'):
                    seat_assignment = SeatAssignment(
                        booking_id=booking.id,
                        ticket_id=booking_ticket.id,
                        seat_no=ticket_data['seat_no'],
                        assigned_by=booking_data.get('created_by_user_id')
                    )
                    db.session.add(seat_assignment)
            
            # Update schedule available seats
            schedule = Schedule.query.get(self.schedule_id)
            if schedule:
                seats_booked = len(booking_data['tickets'])
                schedule.available_seats = max(0, schedule.available_seats - seats_booked)
            
            db.session.commit()
            
            return booking
            
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to create booking: {str(e)}")
    
    def get_booking_by_code(self, code):
        """Get booking by its unique code"""
        return Booking.query.filter_by(code=code).first()
    
    def get_bookings_for_schedule(self, filters=None):
        """Get all bookings for a schedule with optional filters"""
        query = Booking.query.filter_by(schedule_id=self.schedule_id)
        
        if filters:
            if filters.get('channel'):
                query = query.filter_by(channel=filters['channel'])
            if filters.get('payment_status'):
                query = query.filter_by(payment_status=filters['payment_status'])
            if filters.get('fulfillment_status'):
                query = query.filter_by(fulfillment_status=filters['fulfillment_status'])
            if filters.get('agent_id'):
                query = query.filter_by(agent_id=filters['agent_id'])
        
        return query.order_by(Booking.created_at.desc()).all()
    
    def update_booking_status(self, booking_id, status_type, new_status, user_id=None):
        """Update booking status (payment, fulfillment, or finance)"""
        try:
            booking = Booking.query.get(booking_id)
            if not booking:
                raise ValueError("Booking not found")
            
            if status_type == 'payment':
                booking.payment_status = new_status
            elif status_type == 'fulfillment':
                booking.fulfillment_status = new_status
            elif status_type == 'finance':
                booking.finance_status = new_status
            
            booking.updated_at = datetime.utcnow()
            
            # If confirming booking, post to finance
            if status_type == 'fulfillment' and new_status == 'CONFIRMED':
                self._post_booking_finance(booking)
            
            db.session.commit()
            return booking
            
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to update booking status: {str(e)}")
    
    def assign_seats(self, booking_id, seat_assignments, user_id):
        """Assign seats to booking tickets"""
        try:
            booking = Booking.query.get(booking_id)
            if not booking:
                raise ValueError("Booking not found")
            
            # Remove existing seat assignments
            SeatAssignment.query.filter_by(booking_id=booking_id).delete()
            
            # Create new seat assignments
            for assignment in seat_assignments:
                seat_assignment = SeatAssignment(
                    booking_id=booking_id,
                    ticket_id=assignment['ticket_id'],
                    seat_no=assignment['seat_no'],
                    assigned_by=user_id
                )
                db.session.add(seat_assignment)
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to assign seats: {str(e)}")
    
    def cancel_booking(self, booking_id, reason, user_id):
        """Cancel a booking"""
        try:
            booking = Booking.query.get(booking_id)
            if not booking:
                raise ValueError("Booking not found")
            
            # Update status
            booking.fulfillment_status = 'CANCELLED'
            booking.meta = json.dumps({
                **json.loads(booking.meta or '{}'),
                'cancelled_at': datetime.utcnow().isoformat(),
                'cancelled_by': user_id,
                'cancellation_reason': reason
            })
            
            # Update schedule available seats
            schedule = Schedule.query.get(self.schedule_id)
            if schedule:
                seats_booked = len(booking.tickets)
                schedule.available_seats = min(
                    schedule.total_seats, 
                    schedule.available_seats + seats_booked
                )
            
            db.session.commit()
            return booking
            
        except Exception as e:
            db.session.rollback()
            raise ValueError(f"Failed to cancel booking: {str(e)}")
    
    def _post_booking_finance(self, booking):
        """Post booking to finance system (placeholder for now)"""
        # This would integrate with the ledger system
        # For now, just mark as posted
        booking.finance_status = 'POSTED'
        pass
    
    def get_booking_summary(self, booking_id):
        """Get comprehensive booking summary"""
        booking = Booking.query.get(booking_id)
        if not booking:
            return None
        
        # Parse line items
        line_items = json.loads(booking.line_items or '[]')
        
        # Get ticket details
        tickets = []
        for ticket in booking.tickets:
            ticket_type = TicketType.query.get(ticket.ticket_type_id)
            tickets.append({
                'id': ticket.id,
                'ticket_type_name': ticket_type.name if ticket_type else 'Unknown',
                'ticket_type_code': ticket_type.code if ticket_type else 'UNK',
                'passenger_name': ticket.passenger_name,
                'passenger_phone': ticket.passenger_phone,
                'seat_no': ticket.seat_no,
                'fare_base_price': float(ticket.fare_base_price_snapshot)
            })
        
        return {
            'id': booking.id,
            'code': booking.code,
            'channel': booking.channel,
            'buyer_name': booking.buyer_name,
            'buyer_phone': booking.buyer_phone,
            'status': {
                'payment': booking.payment_status,
                'fulfillment': booking.fulfillment_status,
                'finance': booking.finance_status
            },
            'pricing': {
                'subtotal': float(booking.subtotal),
                'tax_total': float(booking.tax_total),
                'discount_total': float(booking.discount_total),
                'grand_total': float(booking.grand_total),
                'currency': booking.currency
            },
            'line_items': line_items,
            'tickets': tickets,
            'created_at': booking.created_at.isoformat(),
            'updated_at': booking.updated_at.isoformat()
        }
