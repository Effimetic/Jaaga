from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash, session
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, time
from models.scheduling import Schedule, ScheduleDestination, ScheduleSeat, Island, Destination, OwnerBooking, OwnerBookingSeat
from models.boat_management import Boat
from models.user import User
from models.unified_booking import TicketType, TaxProfile, ScheduleTicketType
from models import db
import json

scheduling_bp = Blueprint('scheduling', __name__)

@scheduling_bp.route('/schedules', methods=['GET'])
@jwt_required()
def schedules():
    """Get schedules for the current user"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access schedules.'}), 403
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query
        query = Schedule.query.filter_by(owner_id=user.id)
        
        # Apply date filters
        if start_date:
            query = query.filter(Schedule.schedule_date >= start_date)
        if end_date:
            query = query.filter(Schedule.schedule_date <= end_date)
        
        # Order by date descending
        query = query.order_by(Schedule.schedule_date.desc())
        
        # Paginate
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        schedules_data = []
        for schedule in pagination.items:
            schedules_data.append({
                'id': schedule.id,
                'name': schedule.name,
                'schedule_date': schedule.schedule_date.isoformat(),
                'boat': {
                    'id': schedule.boat.id,
                    'name': schedule.boat.name
                },
                'total_seats': schedule.total_seats,
                'available_seats': schedule.available_seats,
                'status': schedule.status,
                'destinations': [
                    {
                        'id': dest.id,
                        'island_name': dest.island_name,
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
            'schedules': schedules_data,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get schedules: {str(e)}'}), 500

@scheduling_bp.route('/schedules/list', methods=['GET'])
@jwt_required()
def list_schedules():
    """List schedules with pagination and filtering"""
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
        query = query.order_by(Schedule.schedule_date.asc())
        
        # Get all results for mobile app (no pagination for now)
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
                'total_seats': schedule.total_seats,
                'available_seats': schedule.available_seats,
                'status': schedule.status,
                'destinations': [
                    {
                        'id': dest.id,
                        'island_name': dest.island_name,
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
        return jsonify({'error': f'Failed to list schedules: {str(e)}'}), 500

@scheduling_bp.route('/schedules/<int:schedule_id>', methods=['GET'])
@jwt_required()
def get_schedule(schedule_id):
    """Get a specific schedule by ID"""
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
        
        schedule_data = {
            'id': schedule.id,
            'name': schedule.name,
            'schedule_date': schedule.schedule_date.isoformat(),
            'boat': {
                'id': schedule.boat.id,
                'name': schedule.boat.name,
                'total_seats': schedule.boat.total_seats,
                'seating_type': schedule.boat.seating_type
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
            'created_at': schedule.created_at.isoformat() if schedule.created_at else None,
            'updated_at': schedule.updated_at.isoformat() if schedule.updated_at else None
        }
        
        return jsonify({
            'success': True,
            'data': schedule_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get schedule: {str(e)}'}), 500

@scheduling_bp.route('/schedules/create', methods=['POST'])
@jwt_required()
def create_schedule():
    """Create a new schedule"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        schedule_name = data.get('name', '').strip()
        boat_id = data.get('boat_id')
        schedule_date = data.get('schedule_date')
        destinations = data.get('destinations', [])
        
        if not all([schedule_name, boat_id, schedule_date, destinations]):
            return jsonify({'error': 'Name, boat, date, and destinations are required'}), 400
        
        # Validate boat ownership
        boat = Boat.query.filter_by(id=boat_id, owner_id=user.id).first()
        if not boat:
            return jsonify({'error': 'Boat not found or access denied'}), 404
        
        # Parse schedule date
        try:
            schedule_date_obj = datetime.strptime(schedule_date, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Create schedule
        schedule = Schedule(
            name=schedule_name,
            boat_id=boat_id,
            owner_id=user.id,
            schedule_date=schedule_date_obj,
            total_seats=boat.total_seats,
            available_seats=boat.total_seats,
            confirmation_type=data.get('confirmation_type', 'immediate'),
            is_public=data.get('is_public', True),
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
        
        # Handle blocked seats
        blocked_seats = data.get('blocked_seats', [])
        for seat_data in blocked_seats:
            blocked_seat = ScheduleSeat(
                schedule_id=schedule.id,
                seat_number=seat_data['seat_number'],
                is_blocked=True,
                reason=seat_data.get('reason', 'Owner reserved')
            )
            db.session.add(blocked_seat)
        
        # Update available seats
        schedule.available_seats = schedule.total_seats - len(blocked_seats)
        
        db.session.commit()
        
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

@scheduling_bp.route('/schedules/<int:schedule_id>', methods=['PUT'])
@jwt_required()
def update_schedule(schedule_id):
    """Update an existing schedule"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can update schedules.'}), 403
        
        schedule = Schedule.query.filter_by(id=schedule_id, owner_id=user.id).first()
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        data = request.get_json()
        
        # Update basic fields
        if 'name' in data:
            schedule.name = data['name'].strip()
        if 'confirmation_type' in data:
            schedule.confirmation_type = data['confirmation_type']
        if 'is_public' in data:
            schedule.is_public = data['is_public']
        if 'status' in data:
            schedule.status = data['status']
        
        # Update destinations if provided
        if 'destinations' in data:
            # Remove existing destinations
            ScheduleDestination.query.filter_by(schedule_id=schedule.id).delete()
            
            # Add new destinations
            for i, dest_data in enumerate(data['destinations']):
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
        
        schedule.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Schedule updated successfully',
            'schedule': {
                'id': schedule.id,
                'name': schedule.name,
                'status': schedule.status
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update schedule: {str(e)}'}), 500

@scheduling_bp.route('/schedules/<int:schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(schedule_id):
    """Delete a schedule"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can delete schedules.'}), 403
        
        schedule = Schedule.query.filter_by(id=schedule_id, owner_id=user.id).first()
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        # Check if schedule has bookings
        if schedule.bookings:
            return jsonify({'error': 'Cannot delete schedule with existing bookings'}), 400
        
        # Delete related data
        ScheduleDestination.query.filter_by(schedule_id=schedule.id).delete()
        ScheduleSeat.query.filter_by(schedule_id=schedule.id).delete()
        
        # Delete schedule
        db.session.delete(schedule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Schedule deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete schedule: {str(e)}'}), 500

@scheduling_bp.route('/api/islands', methods=['GET'])
@jwt_required()
def get_islands():
    """Get all islands"""
    try:
        islands = Island.query.filter_by(is_active=True).order_by(Island.atoll, Island.name).all()
        
        islands_data = [
            {
                'id': island.id,
                'atoll': island.atoll,
                'name': island.name,
                'alt_name': island.alt_name,
                'latitude': island.latitude,
                'longitude': island.longitude
            } for island in islands
        ]
        
        return jsonify({
            'success': True,
            'data': islands_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get islands: {str(e)}'}), 500

@scheduling_bp.route('/api/destinations', methods=['GET'])
@jwt_required()
def get_destinations():
    """Get popular destinations"""
    try:
        destinations = Destination.query.filter_by(is_active=True).order_by(Destination.display_order, Destination.name).all()
        
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

@scheduling_bp.route('/api/schedules/<int:schedule_id>/ticket-types', methods=['GET'])
@jwt_required()
def get_schedule_ticket_types(schedule_id):
    """Get ticket types for a specific schedule"""
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
        
        # Get schedule ticket types
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
                    'surcharge': float(stt.surcharge),
                    'discount': float(stt.discount),
                    'final_price': final_price,
                    'currency': ticket_type.currency,
                    'refundable': ticket_type.refundable,
                    'channel': stt.channel
                })
        
        return jsonify({
            'success': True,
            'data': ticket_types_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get schedule ticket types: {str(e)}'}), 500

@scheduling_bp.route('/api/islands/search', methods=['GET'])
@jwt_required()
def search_islands():
    """Search islands by name"""
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