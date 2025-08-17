from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models.unified_booking import Booking, TicketType, TaxProfile
from models.scheduling import Schedule
from services.unified_booking import UnifiedBookingService
from models import db

unified_booking_bp = Blueprint('unified_booking', __name__)

@unified_booking_bp.route('/schedules/<int:schedule_id>/bookings', methods=['GET'])
@login_required
def get_schedule_bookings(schedule_id):
    """Get all bookings for a schedule"""
    schedule = Schedule.query.get_or_404(schedule_id)
    
    if schedule.owner_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Access denied'}), 403
    
    service = UnifiedBookingService(schedule.owner_id, schedule_id)
    bookings = service.get_bookings_for_schedule()
    
    booking_list = []
    for booking in bookings:
        booking_data = service.get_booking_summary(booking.id)
        if booking_data:
            booking_list.append(booking_data)
    
    return jsonify({'bookings': booking_list})

@unified_booking_bp.route('/schedules/<int:schedule_id>/bookings', methods=['POST'])
@login_required
def create_booking(schedule_id):
    """Create a new booking"""
    schedule = Schedule.query.get_or_404(schedule_id)
    
    if schedule.owner_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        data = request.get_json()
        service = UnifiedBookingService(schedule.owner_id, schedule_id)
        booking = service.create_booking(data)
        
        return jsonify({
            'message': 'Booking created successfully',
            'booking': {
                'id': booking.id,
                'code': booking.code,
                'grand_total': float(booking.grand_total)
            }
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create booking: {str(e)}'}), 500

@unified_booking_bp.route('/bookings/<int:booking_id>', methods=['GET'])
@login_required
def get_booking(booking_id):
    """Get booking details by ID"""
    booking = Booking.query.get_or_404(booking_id)
    
    if booking.owner_id != current_user.id and current_user.role != 'admin':
        return jsonify({'error': 'Access denied'}), 403
    
    service = UnifiedBookingService(booking.owner_id, booking.schedule_id)
    booking_data = service.get_booking_summary(booking_id)
    
    return jsonify({'booking': booking_data})

@unified_booking_bp.route('/bookings/code/<code>', methods=['GET'])
def get_booking_by_code(code):
    """Get booking by code (public endpoint)"""
    booking = Booking.query.filter_by(code=code).first()
    
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    return jsonify({
        'booking': {
            'code': booking.code,
            'buyer_name': booking.buyer_name,
            'status': booking.fulfillment_status,
            'grand_total': float(booking.grand_total)
        }
    })

# Ticket Type Management
@unified_booking_bp.route('/ticket-types', methods=['GET'])
@login_required
def get_ticket_types():
    """Get all ticket types for the current user"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    ticket_types = TicketType.query.filter_by(
        owner_id=current_user.id,
        active=True
    ).all()
    
    types_list = []
    for tt in ticket_types:
        types_list.append({
            'id': tt.id,
            'name': tt.name,
            'code': tt.code,
            'base_price': float(tt.base_price),
            'currency': tt.currency,
            'refundable': tt.refundable,
            'baggage_rules': tt.baggage_rules
        })
    
    return jsonify({'ticket_types': types_list})

# Tax Profile Management
@unified_booking_bp.route('/tax-profiles', methods=['GET'])
@login_required
def get_tax_profiles():
    """Get all tax profiles for the current user"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    tax_profiles = TaxProfile.query.filter_by(
        owner_id=current_user.id,
        active=True
    ).all()
    
    profiles_list = []
    for tp in tax_profiles:
        profiles_list.append({
            'id': tp.id,
            'name': tp.name,
            'lines': tp.lines,
            'rounding_rule': tp.rounding_rule
        })
    
    return jsonify({'tax_profiles': profiles_list})

# Schedule Ticket Types - Moved to scheduling.py to avoid route conflicts
# This route is now handled by /schedules/api/schedules/<schedule_id>/ticket-types

# Agents List
@unified_booking_bp.route('/agents', methods=['GET'])
@login_required
def get_agents():
    """Get agents for the current user"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    from models.owner_settings import OwnerAgentConnection
    agent_connections = OwnerAgentConnection.query.filter_by(
        owner_id=current_user.id,
        status='active'
    ).all()
    
    agents = []
    for connection in agent_connections:
        agents.append({
            'id': connection.agent_id,
            'name': connection.agent_name,
            'phone': connection.agent_phone,
            'commission_percent': float(connection.commission_percent) if connection.commission_percent else 0
        })
    
    return jsonify({'agents': agents})
