from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Schedule, ScheduleTicketType, ScheduleDestination, ScheduleSeat
from models.unified_booking import Booking, TicketType, TaxProfile
from utils import get_user_by_phone
from services.unified_booking import UnifiedBookingService
from services.sms_service import sms_service
from datetime import date

unified_booking_bp = Blueprint('unified_booking', __name__)

@unified_booking_bp.route('/bookings', methods=['GET'])
@jwt_required()
def get_user_bookings():
    """Get bookings for current user"""
    try:
        phone = get_jwt_identity()
        user = get_user_by_phone(phone)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get bookings based on user role
        if user.role == 'owner':
            bookings = Booking.query.filter_by(owner_id=user.id).order_by(Booking.created_at.desc()).all()
        elif user.role == 'agent':
            bookings = Booking.query.filter_by(agent_id=user.id).order_by(Booking.created_at.desc()).all()
        else:
            # Public user - find bookings by phone
            bookings = Booking.query.filter_by(buyer_phone=user.phone).order_by(Booking.created_at.desc()).all()
        
        bookings_data = []
        for booking in bookings:
            schedule = Schedule.query.get(booking.schedule_id)
            bookings_data.append({
                'id': booking.id,
                'code': booking.code,
                'buyer_name': booking.buyer_name,
                'buyer_phone': booking.buyer_phone,
                'schedule_name': schedule.name if schedule else 'Unknown',
                'schedule_date': schedule.schedule_date.isoformat() if schedule else None,
                'boat_name': schedule.boat.name if schedule and schedule.boat else 'Unknown',
                'grand_total': float(booking.grand_total),
                'currency': booking.currency,
                'payment_status': booking.payment_status,
                'fulfillment_status': booking.fulfillment_status,
                'created_at': booking.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'data': bookings_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get bookings: {str(e)}'}), 500

@unified_booking_bp.route('/schedules', methods=['GET'])
@jwt_required()
def get_schedules():
    """Get schedules for the current user"""
    try:
        phone = get_jwt_identity()
        user = get_user_by_phone(phone)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get schedules based on user role
        if user.role == 'owner':
            schedules = Schedule.query.filter_by(owner_id=user.id).all()
        elif user.role == 'agent':
            # Get schedules from connected owners
            from models.owner_settings import OwnerAgentConnection
            schedules = Schedule.query.join(OwnerAgentConnection).filter(
                OwnerAgentConnection.agent_id == user.id,
                OwnerAgentConnection.status == 'approved'
            ).all()
        else:
            # Public users can see all published schedules
            schedules = Schedule.query.filter_by(status='PUBLISHED').all()
        
        schedules_data = []
        for schedule in schedules:
            schedules_data.append({
                'id': schedule.id,
                'name': schedule.name,
                'schedule_date': schedule.schedule_date.isoformat() if schedule.schedule_date else None,
                'status': schedule.status,
                'boat_name': schedule.boat.name if schedule.boat else None,
                'owner_name': schedule.owner.name if schedule.owner else None
            })
        
        return jsonify({
            'success': True,
            'data': schedules_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get schedules: {str(e)}'}), 500

@unified_booking_bp.route('/schedules/<int:schedule_id>', methods=['GET'])
@jwt_required()
def get_schedule(schedule_id):
    """Get a specific schedule by ID"""
    try:
        phone = get_jwt_identity()
        user = get_user_by_phone(phone)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        schedule = Schedule.query.get_or_404(schedule_id)
        
        # Check access based on user role
        if user.role == 'owner' and schedule.owner_id != user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        schedule_data = {
            'id': schedule.id,
            'name': schedule.name,
            'schedule_date': schedule.schedule_date.isoformat() if schedule.schedule_date else None,
            'status': schedule.status,
            'boat_name': schedule.boat.name if schedule.boat else None,
            'owner_name': schedule.owner.name if schedule.owner else None
        }
        
        return jsonify({
            'success': True,
            'data': schedule_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get schedule: {str(e)}'}), 500

@unified_booking_bp.route('/schedules/<int:schedule_id>/bookings', methods=['POST'])
@jwt_required()
def create_booking(schedule_id):
    """Create a new booking"""
    phone = get_jwt_identity()
    user = User.query.filter_by(phone=phone).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    schedule = Schedule.query.get_or_404(schedule_id)
    
    # Allow booking for public users, agents, and owners
    if not schedule.is_public and user.role not in ['owner', 'admin']:
        return jsonify({'error': 'Schedule not available for booking'}), 403
    
    try:
        data = request.get_json()
        
        # Set channel based on user role
        if user.role == 'owner':
            data['channel'] = 'OWNER'
        elif user.role == 'agent':
            data['channel'] = 'AGENT'
            data['agent_id'] = user.id
        else:
            data['channel'] = 'PUBLIC'
        
        data['created_by_user_id'] = user.id
        
        service = UnifiedBookingService(schedule.owner_id, schedule_id)
        booking = service.create_booking(data)
        
        # Send SMS notification
        try:
            sms_service.send_booking_confirmation(
                booking.buyer_phone,
                booking.code,
                schedule.name,
                schedule.schedule_date.strftime('%Y-%m-%d')
            )
        except Exception as sms_error:
            print(f"SMS notification failed: {sms_error}")
        
        return jsonify({
            'success': True,
            'message': 'Booking created successfully',
            'booking': {
                'id': booking.id,
                'code': booking.code,
                'grand_total': float(booking.grand_total),
                'currency': booking.currency
            }
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to create booking: {str(e)}'}), 500

@unified_booking_bp.route('/bookings/<int:booking_id>', methods=['GET'])
@jwt_required()
def get_booking(booking_id):
    """Get booking details by ID"""
    phone = get_jwt_identity()
    user = User.query.filter_by(phone=phone).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    booking = Booking.query.get_or_404(booking_id)
    
    # Check access permissions
    has_access = (
        booking.owner_id == user.id or  # Owner
        booking.agent_id == user.id or  # Agent who made booking
        booking.buyer_phone == user.phone or  # Buyer
        user.role == 'admin'  # Admin
    )
    
    if not has_access:
        return jsonify({'error': 'Access denied'}), 403
    
    service = UnifiedBookingService(booking.owner_id, booking.schedule_id)
    booking_data = service.get_booking_summary(booking_id)
    
    return jsonify({
        'success': True,
        'data': booking_data
    })

@unified_booking_bp.route('/bookings/code/<code>', methods=['GET'])
def get_booking_by_code(code):
    """Get booking by code (public endpoint)"""
    booking = Booking.query.filter_by(code=code).first()
    
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    schedule = Schedule.query.get(booking.schedule_id)
    
    return jsonify({
        'success': True,
        'booking': {
            'id': booking.id,
            'code': booking.code,
            'buyer_name': booking.buyer_name,
            'buyer_phone': booking.buyer_phone,
            'schedule_name': schedule.name if schedule else 'Unknown',
            'schedule_date': schedule.schedule_date.isoformat() if schedule else None,
            'boat_name': schedule.boat.name if schedule and schedule.boat else 'Unknown',
            'payment_status': booking.payment_status,
            'fulfillment_status': booking.fulfillment_status,
            'grand_total': float(booking.grand_total),
            'currency': booking.currency,
            'created_at': booking.created_at.isoformat()
        }
    })

# Ticket Type Management
@unified_booking_bp.route('/ticket-types', methods=['GET'])
@jwt_required()
def get_ticket_types():
    """Get all ticket types for the current user"""
    phone = get_jwt_identity()
    user = User.query.filter_by(phone=phone).first()
    
    if not user or user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    ticket_types = TicketType.query.filter_by(
        owner_id=user.id,
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
    
    return jsonify({
        'success': True,
        'data': types_list
    })

# Tax Profile Management
@unified_booking_bp.route('/tax-profiles', methods=['GET'])
@jwt_required()
def get_tax_profiles():
    """Get all tax profiles for the current user"""
    phone = get_jwt_identity()
    user = User.query.filter_by(phone=phone).first()
    
    if not user or user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    tax_profiles = TaxProfile.query.filter_by(
        owner_id=user.id,
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
    
    return jsonify({
        'success': True,
        'data': profiles_list
    })

# Agents List
@unified_booking_bp.route('/owner-agents', methods=['GET'])
@jwt_required()
def get_agents():
    """Get agents for the current user"""
    phone = get_jwt_identity()
    user = User.query.filter_by(phone=phone).first()
    
    if not user or user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    from models.owner_settings import OwnerAgentConnection
    agent_connections = OwnerAgentConnection.query.filter_by(
        owner_id=user.id,
        status='approved'
    ).all()
    
    agents = []
    for connection in agent_connections:
        agents.append({
            'id': connection.agent.id,
            'name': connection.agent.name,
            'phone': connection.agent.phone,
            'credit_limit': float(connection.credit_limit),
            'current_balance': float(connection.current_balance)
        })
    
    return jsonify({
        'success': True,
        'data': agents
    })

@unified_booking_bp.route('/agent-owners', methods=['GET'])
@jwt_required()
def get_agent_owners():
    """Get owners connected to current agent"""
    try:
        phone = get_jwt_identity()
        user = get_user_by_phone(phone)
        
        if not user or user.role != 'agent':
            return jsonify({'error': 'Access denied. Only agents can access this endpoint.'}), 403
        
        from models.owner_settings import OwnerAgentConnection
        connections = OwnerAgentConnection.query.filter_by(
            agent_id=user.id,
            status='approved'
        ).all()
        
        owners = []
        for connection in connections:
            owners.append({
                'id': connection.owner.id,
                'name': connection.owner.name,
                'phone': connection.owner.phone,
                'credit_limit': float(connection.credit_limit),
                'current_balance': float(connection.current_balance),
                'currency': connection.currency
            })
        
        return jsonify({
            'success': True,
            'data': owners
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get connected owners: {str(e)}'}), 500

@unified_booking_bp.route('/agent-schedules', methods=['GET'])
@jwt_required()
def get_agent_schedules():
    """Get schedules from owners connected to current agent"""
    try:
        phone = get_jwt_identity()
        user = get_user_by_phone(phone)
        
        if not user or user.role != 'agent':
            return jsonify({'error': 'Access denied. Only agents can access this endpoint.'}), 403
        
        # Get connected owners
        from models.owner_settings import OwnerAgentConnection
        connections = OwnerAgentConnection.query.filter_by(
            agent_id=user.id,
            status='approved'
        ).all()
        
        owner_ids = [conn.owner_id for conn in connections]
        
        if not owner_ids:
            return jsonify({
                'success': True,
                'data': [],
                'message': 'No connected owners found'
            })
        
        # Get schedules from connected owners
        schedules = Schedule.query.filter(
            Schedule.owner_id.in_(owner_ids),
            Schedule.status == 'PUBLISHED',
            Schedule.schedule_date >= date.today()
        ).order_by(Schedule.schedule_date.asc()).all()
        
        schedules_data = []
        for schedule in schedules:
            # Get ticket types
            schedule_ticket_types = ScheduleTicketType.query.filter_by(
                schedule_id=schedule.id,
                active=True
            ).all()
            
            min_price = None
            if schedule_ticket_types:
                prices = []
                for stt in schedule_ticket_types:
                    ticket_type = TicketType.query.get(stt.ticket_type_id)
                    if ticket_type:
                        final_price = float(ticket_type.base_price) + float(stt.surcharge) - float(stt.discount)
                        prices.append(final_price)
                min_price = min(prices) if prices else None
            
            schedules_data.append({
                'id': schedule.id,
                'name': schedule.name,
                'schedule_date': schedule.schedule_date.isoformat(),
                'boat': {
                    'id': schedule.boat.id,
                    'name': schedule.boat.name
                },
                'owner': {
                    'id': schedule.owner.id,
                    'name': schedule.owner.name
                },
                'total_seats': schedule.total_seats,
                'available_seats': schedule.available_seats,
                'min_price': min_price,
                'currency': 'MVR',
                'destinations': [
                    {
                        'id': dest.id,
                        'island_name': dest.island_name,
                        'sequence_order': dest.sequence_order,
                        'departure_time': dest.departure_time.strftime('%H:%M') if dest.departure_time else None,
                        'is_pickup': dest.is_pickup,
                        'is_dropoff': dest.is_dropoff
                    } for dest in schedule.destinations
                ]
            })
        
        return jsonify({
            'success': True,
            'data': schedules_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get agent schedules: {str(e)}'}), 500