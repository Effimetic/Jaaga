from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, time
from models.scheduling import Schedule, ScheduleDestination, ScheduleSeat, Island, Destination, OwnerBooking, OwnerBookingSeat
from models.boat_management import Boat
from models.user import User
from models.unified_booking import TicketType, TaxProfile, ScheduleTicketType
from models.owner_settings import OwnerSettings
from models import db
import json

scheduling_bp = Blueprint('scheduling', __name__)

@scheduling_bp.route('/schedules', methods=['GET'])
@jwt_required()
def get_schedules():
    """Get schedules for the current user"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query based on user role
        if user.role == 'owner':
            query = Schedule.query.filter_by(owner_id=user.id)
        else:
            # For public users and agents, show only public schedules
            query = Schedule.query.filter_by(is_public=True, status='PUBLISHED')
        
        # Apply date filters
        if start_date:
            query = query.filter(Schedule.schedule_date >= start_date)
        if end_date:
            query = query.filter(Schedule.schedule_date <= end_date)
        
        # Order by date
        query = query.order_by(Schedule.schedule_date.desc())
        
        # Get results
        schedules = query.all()
        
        schedules_data = []
        for schedule in schedules:
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
                'status': schedule.status,
                'confirmation_type': schedule.confirmation_type,
                'is_public': schedule.is_public,
                'destinations': [
                    {
                        'id': dest.id,
                        'island_name': dest.island_name,
                        'sequence_order': dest.sequence_order,
                        'departure_time': dest.departure_time.strftime('%H:%M') if dest.departure_time else None,
                        'arrival_time': dest.arrival_time.strftime('%H:%M') if dest.arrival_time else None,
                        'is_pickup': dest.is_pickup,
                        'is_dropoff': dest.is_dropoff
                    } for dest in schedule.destinations
                ],
                'created_at': schedule.created_at.isoformat() if schedule.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': schedules_data,
            'total': len(schedules_data)
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get schedules: {str(e)}'}), 500

@scheduling_bp.route('/schedules/search', methods=['GET'])
def search_schedules():
    """Public endpoint to search schedules"""
    try:
        # Get search parameters
        from_island = request.args.get('from')
        to_island = request.args.get('to')
        travel_date = request.args.get('date')
        passengers = request.args.get('passengers', 1, type=int)
        
        # Build query for public schedules
        query = Schedule.query.filter_by(
            is_public=True, 
            status='PUBLISHED'
        ).filter(Schedule.available_seats >= passengers)
        
        # Filter by date
        if travel_date:
            try:
                date_obj = datetime.strptime(travel_date, '%Y-%m-%d').date()
                query = query.filter(Schedule.schedule_date == date_obj)
            except ValueError:
                return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Filter by route if provided
        if from_island and to_island:
            # Find schedules that have both islands in their route
            schedule_ids = db.session.query(Schedule.id).join(ScheduleDestination).filter(
                Schedule.is_public == True,
                Schedule.status == 'PUBLISHED',
                ScheduleDestination.island_name.ilike(f'%{from_island}%')
            ).subquery()
            
            schedule_ids_with_to = db.session.query(Schedule.id).join(ScheduleDestination).filter(
                Schedule.id.in_(schedule_ids),
                ScheduleDestination.island_name.ilike(f'%{to_island}%')
            ).subquery()
            
            query = query.filter(Schedule.id.in_(schedule_ids_with_to))
        
        schedules = query.order_by(Schedule.schedule_date.asc()).all()
        
        schedules_data = []
        for schedule in schedules:
            # Get ticket types for pricing
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
                        'arrival_time': dest.arrival_time.strftime('%H:%M') if dest.arrival_time else None,
                        'is_pickup': dest.is_pickup,
                        'is_dropoff': dest.is_dropoff
                    } for dest in schedule.destinations
                ]
            })
        
        return jsonify({
            'success': True,
            'data': schedules_data,
            'total': len(schedules_data),
            'search_params': {
                'from': from_island,
                'to': to_island,
                'date': travel_date,
                'passengers': passengers
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to search schedules: {str(e)}'}), 500

@scheduling_bp.route('/schedules/create', methods=['POST'])
@jwt_required()
def create_schedule():
    """Create schedule - Step 1: Set date"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
        
        data = request.get_json()
        schedule_date = data.get('schedule_date')
        
        if not schedule_date:
            return jsonify({'error': 'Schedule date is required'}), 400
        
        # Parse and validate date
        try:
            date_obj = datetime.strptime(schedule_date, '%Y-%m-%d').date()
            if date_obj < date.today():
                return jsonify({'error': 'Schedule date must be in the future'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Store in session for multi-step process
        session['schedule_creation'] = {
            'schedule_date': schedule_date,
            'step': 1
        }
        
        return jsonify({
            'success': True,
            'message': 'Schedule date set successfully',
            'redirect': '/schedules/select-boat'
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to set schedule date: {str(e)}'}), 500

@scheduling_bp.route('/schedules/select-boat', methods=['GET', 'POST'])
@jwt_required()
def select_boat():
    """Create schedule - Step 2: Select boat"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
        
        if request.method == 'GET':
            # Get user's boats
            boats = Boat.query.filter_by(owner_id=user.id, is_active=True).all()
            
            boats_data = [
                {
                    'id': boat.id,
                    'name': boat.name,
                    'total_seats': boat.total_seats,
                    'seating_type': boat.seating_type
                } for boat in boats
            ]
            
            return jsonify({
                'success': True,
                'data': boats_data,
                'session': session.get('schedule_creation', {})
            })
        
        # POST - Select boat
        data = request.get_json()
        boat_id = data.get('boat_id')
        
        if not boat_id:
            return jsonify({'error': 'Boat selection is required'}), 400
        
        # Validate boat ownership
        boat = Boat.query.filter_by(id=boat_id, owner_id=user.id, is_active=True).first()
        if not boat:
            return jsonify({'error': 'Boat not found or access denied'}), 404
        
        # Update session
        schedule_creation = session.get('schedule_creation', {})
        schedule_creation.update({
            'boat_id': boat_id,
            'step': 2
        })
        session['schedule_creation'] = schedule_creation
        
        return jsonify({
            'success': True,
            'message': 'Boat selected successfully',
            'redirect': '/schedules/block-seats'
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to select boat: {str(e)}'}), 500

@scheduling_bp.route('/schedules/block-seats', methods=['GET', 'POST'])
@jwt_required()
def block_seats():
    """Create schedule - Step 3: Block seats"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
        
        schedule_creation = session.get('schedule_creation', {})
        if not schedule_creation.get('boat_id'):
            return jsonify({'error': 'Please select a boat first'}), 400
        
        if request.method == 'GET':
            # Get boat details for seat configuration
            boat = Boat.query.get(schedule_creation['boat_id'])
            if not boat:
                return jsonify({'error': 'Boat not found'}), 404
            
            boat_data = {
                'id': boat.id,
                'name': boat.name,
                'total_seats': boat.total_seats,
                'seating_type': boat.seating_type,
                'seating_chart': boat.seating_chart
            }
            
            return jsonify({
                'success': True,
                'data': boat_data,
                'session': schedule_creation
            })
        
        # POST - Configure blocked seats
        data = request.get_json()
        blocked_seats = data.get('blocked_seats', [])
        blocked_count = data.get('blocked_count', 0)
        
        # Update session
        schedule_creation.update({
            'blocked_seats': blocked_seats,
            'blocked_count': blocked_count,
            'step': 3
        })
        session['schedule_creation'] = schedule_creation
        
        return jsonify({
            'success': True,
            'message': 'Seat configuration saved',
            'redirect': '/schedules/set-destinations'
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to configure seats: {str(e)}'}), 500

@scheduling_bp.route('/schedules/set-destinations', methods=['GET', 'POST'])
@jwt_required()
def set_destinations():
    """Create schedule - Step 4: Set destinations"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
        
        schedule_creation = session.get('schedule_creation', {})
        if not schedule_creation.get('boat_id'):
            return jsonify({'error': 'Please complete previous steps first'}), 400
        
        if request.method == 'GET':
            # Get recent destination names for suggestions
            recent_destinations = db.session.query(ScheduleDestination.island_name).distinct().limit(10).all()
            recent_names = [dest[0] for dest in recent_destinations]
            
            return jsonify({
                'success': True,
                'recent_names': recent_names,
                'session': schedule_creation
            })
        
        # POST - Set destinations and create schedule
        data = request.get_json()
        destinations = data.get('destinations', [])
        schedule_name = data.get('schedule_name', '').strip()
        
        if not destinations:
            return jsonify({'error': 'At least one destination is required'}), 400
        
        # Auto-generate schedule name if not provided
        if not schedule_name:
            destination_names = [dest['island_name'] for dest in destinations]
            schedule_name = ' → '.join(destination_names[:3])
            if len(destinations) > 3:
                schedule_name += f' (+{len(destinations) - 3} more)'
        
        # Get boat details
        boat = Boat.query.get(schedule_creation['boat_id'])
        if not boat:
            return jsonify({'error': 'Boat not found'}), 404
        
        # Create schedule
        schedule_date_obj = datetime.strptime(schedule_creation['schedule_date'], '%Y-%m-%d').date()
        blocked_count = schedule_creation.get('blocked_count', 0)
        
        schedule = Schedule(
            name=schedule_name,
            boat_id=boat.id,
            owner_id=user.id,
            schedule_date=schedule_date_obj,
            total_seats=boat.total_seats,
            available_seats=boat.total_seats - blocked_count,
            confirmation_type='immediate',
            is_public=True,
            status='PUBLISHED'
        )
        
        db.session.add(schedule)
        db.session.flush()  # Get schedule ID
        
        # Add destinations
        for i, dest_data in enumerate(destinations):
            destination = ScheduleDestination(
                schedule_id=schedule.id,
                island_name=dest_data['island_name'],
                sequence_order=i + 1,
                departure_time=datetime.strptime(dest_data['departure_time'], '%H:%M').time() if dest_data.get('departure_time') else None,
                arrival_time=datetime.strptime(dest_data['arrival_time'], '%H:%M').time() if dest_data.get('arrival_time') else None,
                is_pickup=dest_data.get('is_pickup', True),
                is_dropoff=dest_data.get('is_dropoff', True)
            )
            db.session.add(destination)
        
        # Add blocked seats
        blocked_seats = schedule_creation.get('blocked_seats', [])
        for seat_data in blocked_seats:
            blocked_seat = ScheduleSeat(
                schedule_id=schedule.id,
                seat_number=seat_data['seat_number'],
                is_blocked=True,
                reason=seat_data.get('reason', 'Owner reserved')
            )
            db.session.add(blocked_seat)
        
        db.session.commit()
        
        # Clear session
        session.pop('schedule_creation', None)
        
        return jsonify({
            'success': True,
            'message': 'Schedule created successfully',
            'schedule': {
                'id': schedule.id,
                'name': schedule.name,
                'schedule_date': schedule.schedule_date.isoformat()
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create schedule: {str(e)}'}), 500

@scheduling_bp.route('/schedules/<int:schedule_id>', methods=['GET'])
@jwt_required()
def get_schedule(schedule_id):
    """Get schedule details"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        schedule = Schedule.query.get_or_404(schedule_id)
        
        # Check access permissions
        if user.role == 'owner' and schedule.owner_id != user.id:
            return jsonify({'error': 'Access denied'}), 403
        elif user.role != 'owner' and not schedule.is_public:
            return jsonify({'error': 'Schedule not available'}), 403
        
        # Get ticket types for this schedule
        schedule_ticket_types = ScheduleTicketType.query.filter_by(
            schedule_id=schedule_id,
            active=True
        ).all()
        
        ticket_types_data = []
        for stt in schedule_ticket_types:
            ticket_type = TicketType.query.get(stt.ticket_type_id)
            if ticket_type:
                base_price = float(ticket_type.base_price)
                final_price = base_price + float(stt.surcharge) - float(stt.discount)
                
                ticket_types_data.append({
                    'id': ticket_type.id,
                    'name': ticket_type.name,
                    'code': ticket_type.code,
                    'base_price': base_price,
                    'final_price': final_price,
                    'currency': ticket_type.currency,
                    'refundable': ticket_type.refundable
                })
        
        schedule_data = {
            'id': schedule.id,
            'name': schedule.name,
            'schedule_date': schedule.schedule_date.isoformat(),
            'boat': {
                'id': schedule.boat.id,
                'name': schedule.boat.name,
                'total_seats': schedule.boat.total_seats,
                'seating_type': schedule.boat.seating_type,
                'seating_chart': schedule.boat.seating_chart
            },
            'owner': {
                'id': schedule.owner.id,
                'name': schedule.owner.name
            },
            'total_seats': schedule.total_seats,
            'available_seats': schedule.available_seats,
            'status': schedule.status,
            'confirmation_type': schedule.confirmation_type,
            'is_public': schedule.is_public,
            'destinations': [
                {
                    'id': dest.id,
                    'island_name': dest.island_name,
                    'sequence_order': dest.sequence_order,
                    'departure_time': dest.departure_time.strftime('%H:%M') if dest.departure_time else None,
                    'arrival_time': dest.arrival_time.strftime('%H:%M') if dest.arrival_time else None,
                    'is_pickup': dest.is_pickup,
                    'is_dropoff': dest.is_dropoff
                } for dest in schedule.destinations
            ],
            'ticket_types': ticket_types_data,
            'created_at': schedule.created_at.isoformat() if schedule.created_at else None
        }
        
        return jsonify({
            'success': True,
            'data': schedule_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get schedule: {str(e)}'}), 500

@scheduling_bp.route('/schedules/<int:schedule_id>/book', methods=['POST'])
@jwt_required()
def book_schedule():
    """Book tickets for a schedule"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        schedule = Schedule.query.get_or_404(schedule_id)
        
        # Check if schedule is available for booking
        if not schedule.is_public and user.role not in ['owner', 'admin']:
            return jsonify({'error': 'Schedule not available for booking'}), 403
        
        data = request.get_json()
        tickets = data.get('tickets', [])
        buyer_name = data.get('buyer_name', '').strip()
        buyer_phone = data.get('buyer_phone', '').strip()
        
        if not tickets:
            return jsonify({'error': 'At least one ticket is required'}), 400
        
        if not buyer_name or not buyer_phone:
            return jsonify({'error': 'Buyer name and phone are required'}), 400
        
        # Check seat availability
        total_tickets = sum(ticket.get('quantity', 1) for ticket in tickets)
        if schedule.available_seats < total_tickets:
            return jsonify({'error': 'Not enough seats available'}), 400
        
        # Generate booking reference
        import random
        import string
        booking_ref = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        # Determine customer type based on user role
        customer_type = 'public' if user.role == 'public' else 'agent'
        
        # Calculate total amount (simplified for now)
        total_amount = 0
        for ticket in tickets:
            # This would use the pricing engine in a complete implementation
            base_price = 150.00  # Default price
            quantity = ticket.get('quantity', 1)
            total_amount += base_price * quantity
        
        # Create owner booking
        booking = OwnerBooking(
            schedule_id=schedule.id,
            owner_id=schedule.owner_id,
            agent_id=user.id if user.role == 'agent' else None,
            booking_ref=booking_ref,
            customer_type=customer_type,
            price_type='priced',
            total_amount=total_amount,
            currency='MVR',
            contact_phone=buyer_phone,
            contact_name=buyer_name
        )
        
        db.session.add(booking)
        db.session.flush()  # Get booking ID
        
        # Add seat assignments (simplified)
        seat_counter = 1
        for ticket in tickets:
            quantity = ticket.get('quantity', 1)
            for i in range(quantity):
                seat = OwnerBookingSeat(
                    booking_id=booking.id,
                    seat_number=str(seat_counter)
                )
                db.session.add(seat)
                seat_counter += 1
        
        # Update available seats
        schedule.available_seats -= total_tickets
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Booking created successfully',
            'booking': {
                'id': booking.id,
                'booking_ref': booking.booking_ref,
                'total_amount': float(booking.total_amount),
                'currency': booking.currency
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create booking: {str(e)}'}), 500

@scheduling_bp.route('/schedules/<int:schedule_id>/bookings', methods=['GET'])
@jwt_required()
def get_schedule_bookings(schedule_id):
    """Get bookings for a schedule (owner only)"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can view bookings.'}), 403
        
        schedule = Schedule.query.filter_by(id=schedule_id, owner_id=user.id).first()
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        bookings = OwnerBooking.query.filter_by(schedule_id=schedule_id).all()
        
        bookings_data = []
        for booking in bookings:
            bookings_data.append({
                'id': booking.id,
                'booking_ref': booking.booking_ref,
                'customer_type': booking.customer_type,
                'price_type': booking.price_type,
                'total_amount': float(booking.total_amount),
                'currency': booking.currency,
                'contact_name': booking.contact_name,
                'contact_phone': booking.contact_phone,
                'seats': [
                    {
                        'id': seat.id,
                        'seat_number': seat.seat_number
                    } for seat in booking.seats
                ],
                'created_at': booking.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'data': bookings_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get bookings: {str(e)}'}), 500

@scheduling_bp.route('/schedules/clear-session', methods=['POST'])
@jwt_required()
def clear_session():
    """Clear schedule creation session"""
    try:
        session.pop('schedule_creation', None)
        return jsonify({
            'success': True,
            'message': 'Session cleared successfully'
        })
    except Exception as e:
        return jsonify({'error': f'Failed to clear session: {str(e)}'}), 500

@scheduling_bp.route('/api/islands', methods=['GET'])
def get_islands():
    """Get all islands (public endpoint)"""
    try:
        islands = Island.query.filter_by(is_active=True).order_by(Island.atoll, Island.name).all()
        
        islands_data = [
            {
                'id': island.id,
                'atoll': island.atoll,
                'name': island.name,
                'alt_name': island.alt_name
            } for island in islands
        ]
        
        return jsonify({
            'success': True,
            'data': islands_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get islands: {str(e)}'}), 500

@scheduling_bp.route('/api/islands/search', methods=['GET'])
def search_islands():
    """Search islands by name (public endpoint)"""
    try:
        query = request.args.get('q', '').strip()
        
        if len(query) < 2:
            return jsonify([])
        
        islands = Island.query.filter(
            Island.is_active == True,
            db.or_(
                Island.name.ilike(f'%{query}%'),
                Island.alt_name.ilike(f'%{query}%')
            )
        ).order_by(Island.name).limit(10).all()
        
        results = [
            {
                'id': island.id,
                'name': island.name,
                'alt_name': island.alt_name,
                'atoll': island.atoll
            } for island in islands
        ]
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': f'Failed to search islands: {str(e)}'}), 500

@scheduling_bp.route('/api/destinations', methods=['GET'])
def get_destinations():
    """Get popular destinations (public endpoint)"""
    try:
        destinations = Destination.query.filter_by(
            is_active=True,
            is_popular=True
        ).order_by(Destination.display_order, Destination.name).all()
        
        destinations_data = [
            {
                'id': dest.id,
                'name': dest.name,
                'is_popular': dest.is_popular,
                'display_order': dest.display_order
            } for dest in destinations
        ]
        
        return jsonify({
            'success': True,
            'data': destinations_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get destinations: {str(e)}'}), 500