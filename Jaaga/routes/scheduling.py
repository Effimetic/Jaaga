from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_required, current_user
from datetime import datetime, date
from models.scheduling import Schedule, ScheduleDestination, ScheduleSeat, Island, Destination, OwnerBooking, OwnerBookingSeat
from models import db
from models.owner_settings import OwnerAgentConnection
from models.boat_management import Boat
import json

scheduling_bp = Blueprint('scheduling', __name__)

@scheduling_bp.route('/')
@login_required
def schedules():
    """Schedules listing page (mobile app style). Data is loaded via AJAX with filters."""
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can manage schedules.', 'error')
        return redirect(url_for('dashboard'))
    
    # We load the shell; the list will be populated by the JSON endpoint below
    # Provide quick stats counts for initial render
    base_query = Schedule.query.filter_by(owner_id=current_user.id)
    total_count = base_query.count()
    active_count = base_query.filter_by(status='active').count()
    completed_count = base_query.filter_by(status='completed').count()

    return render_template(
        'scheduling/schedules.html',
        schedules=[],
        total_count=total_count,
        active_count=active_count,
        completed_count=completed_count,
    )


def _serialize_schedule(schedule: Schedule) -> dict:
    """Serialize a Schedule for JSON responses."""
    return {
        'id': schedule.id,
        'name': schedule.name,
        'date': schedule.schedule_date.strftime('%Y-%m-%d'),
        'date_display': schedule.schedule_date.strftime('%b %d, %Y'),
        'boat_name': schedule.boat.name if schedule.boat else '—',
        'status': schedule.status,
        'available_seats': schedule.available_seats,
        'total_seats': schedule.total_seats,
        'destinations': [
            {
                'island_name': d.island_name,
                'departure_time': d.departure_time.strftime('%H:%M') if d.departure_time else None,
                'arrival_time': d.arrival_time.strftime('%H:%M') if d.arrival_time else None,
            }
            for d in schedule.destinations
        ],
    }


@scheduling_bp.route('/list', methods=['GET'])
@login_required
def schedules_list():
    """JSON endpoint to fetch schedules with optional date filtering and pagination."""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied.'}), 403

    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 10)), 50)
    except ValueError:
        return jsonify({'error': 'Invalid pagination parameters'}), 400

    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    query = Schedule.query.filter_by(owner_id=current_user.id)

    # Date filter
    try:
        if start_date_str or end_date_str:
            if start_date_str:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                query = query.filter(Schedule.schedule_date >= start_date)
            if end_date_str:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                query = query.filter(Schedule.schedule_date <= end_date)
            # When filtering, show newest first
            query = query.order_by(Schedule.schedule_date.desc(), Schedule.id.desc())
        else:
            # Default: upcoming schedules only, soonest first
            today = date.today()
            query = query.filter(Schedule.schedule_date >= today)
            query = query.order_by(Schedule.schedule_date.asc(), Schedule.id.asc())
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    total_matching = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'items': [_serialize_schedule(s) for s in items],
        'page': page,
        'per_page': per_page,
        'total': total_matching,
        'has_more': (page * per_page) < total_matching,
    })

@scheduling_bp.route('/clear-session', methods=['POST'])
@login_required
def clear_session():
    """Clear schedule creation session data"""
    from flask import session
    session.clear()
    return jsonify({'message': 'Session cleared successfully'})

@scheduling_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create_schedule():
    """Step 1: Choose date and start schedule creation"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
    
    from flask import session
    
    # Clear any existing edit mode data when starting fresh
    if 'edit_mode' in session:
        del session['edit_mode']
    if 'edit_schedule_id' in session:
        del session['edit_schedule_id']
    
    if request.method == 'POST':
        data = request.get_json()
        schedule_date = data.get('schedule_date')
        
        if not schedule_date:
            return jsonify({'error': 'Schedule date is required'}), 400
        
        try:
            # Convert string to date
            schedule_date = datetime.strptime(schedule_date, '%Y-%m-%d').date()
            
            # Check if date is in the future
            if schedule_date < date.today():
                return jsonify({'error': 'Schedule date must be in the future'}), 400
            
            # Store in session for next step
            session['schedule_date'] = schedule_date.isoformat()
            
            return jsonify({'message': 'Date selected', 'redirect': url_for('scheduling.select_boat')})
            
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400
    
    # Check if we're in edit mode
    edit_mode = session.get('edit_mode', False)
    edit_schedule_id = session.get('edit_schedule_id')
    preloaded_date = session.get('schedule_date')
    
    return render_template('scheduling/create_schedule.html',
                         edit_mode=edit_mode,
                         edit_schedule_id=edit_schedule_id,
                         preloaded_date=preloaded_date)

@scheduling_bp.route('/select-boat', methods=['GET', 'POST'])
@login_required
def select_boat():
    """Step 2: Select boat for the schedule"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
    
    from flask import session
    schedule_date = session.get('schedule_date')
    
    if not schedule_date:
        flash('Please select a date first', 'warning')
        return redirect(url_for('scheduling.create_schedule'))
    
    if request.method == 'POST':
        data = request.get_json()
        boat_id = data.get('boat_id')
        
        if not boat_id:
            return jsonify({'error': 'Boat selection is required'}), 400
        
        # Verify boat belongs to user
        boat = Boat.query.filter_by(id=boat_id, owner_id=current_user.id).first()
        if not boat:
            return jsonify({'error': 'Invalid boat selection'}), 400
        
        # Store boat selection
        session['selected_boat_id'] = boat_id
        session['selected_boat_name'] = boat.name
        session['selected_boat_seats'] = boat.total_seats
        
        return jsonify({'message': 'Boat selected', 'redirect': url_for('scheduling.block_seats')})
    
    # Get user's boats
    user_boats = Boat.query.filter_by(owner_id=current_user.id, is_active=True).all()
    schedule_date = datetime.strptime(schedule_date, '%Y-%m-%d').date()
    
    # Check if we're in edit mode
    edit_mode = session.get('edit_mode', False)
    edit_schedule_id = session.get('edit_schedule_id')
    preloaded_boat_id = session.get('selected_boat_id')
    
    return render_template('scheduling/select_boat.html', 
                         boats=user_boats, 
                         schedule_date=schedule_date,
                         edit_mode=edit_mode,
                         edit_schedule_id=edit_schedule_id,
                         preloaded_boat_id=preloaded_boat_id)

@scheduling_bp.route('/block-seats', methods=['GET', 'POST'])
@login_required
def block_seats():
    """Step 3: Block seats that should not be sold publicly"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
    
    from flask import session
    boat_id = session.get('selected_boat_id')
    
    if not boat_id:
        flash('Please select a boat first', 'warning')
        return redirect(url_for('scheduling.create_schedule'))
    
    boat = Boat.query.get(boat_id)
    if not boat or boat.owner_id != current_user.id:
        flash('Invalid boat selection', 'error')
        return redirect(url_for('scheduling.create_schedule'))
    
    if request.method == 'POST':
        data = request.get_json()
        blocked_seats = data.get('blocked_seats', [])
        blocked_count = data.get('blocked_count', 0)
        
        # Store blocked seats info
        session['blocked_seats'] = blocked_seats
        session['blocked_count'] = blocked_count
        
        return jsonify({'message': 'Seats configured', 'redirect': url_for('scheduling.set_destinations')})
    
    # Get boat's seating configuration
    seating_chart = None
    if boat.seating_chart:
        try:
            seating_chart = json.loads(boat.seating_chart)
        except:
            seating_chart = None
    
    # Check if we're in edit mode
    edit_mode = session.get('edit_mode', False)
    edit_schedule_id = session.get('edit_schedule_id')
    preloaded_blocked_seats = session.get('blocked_seats', [])
    preloaded_blocked_count = session.get('blocked_count', 0)
    
    return render_template('scheduling/block_seats.html', 
                         boat=boat, 
                         seating_chart=seating_chart,
                         edit_mode=edit_mode,
                         edit_schedule_id=edit_schedule_id,
                         preloaded_blocked_seats=preloaded_blocked_seats,
                         preloaded_blocked_count=preloaded_blocked_count)

@scheduling_bp.route('/set-destinations', methods=['GET', 'POST'])
@login_required
def set_destinations():
    """Step 4: Set destinations and times"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
    
    from flask import session
    boat_id = session.get('selected_boat_id')
    
    if not boat_id:
        flash('Please complete previous steps first', 'warning')
        return redirect(url_for('scheduling.create_schedule'))
    
    if request.method == 'POST':
        data = request.get_json()
        destinations = data.get('destinations', [])
        schedule_name = data.get('schedule_name', '').strip()
        
        if not destinations:
            return jsonify({'error': 'At least one destination is required'}), 400
        
        try:
            # Process each destination and save to Destination table
            for dest_data in destinations:
                island_name = dest_data['island_name'].strip()
                
                # Check if destination already exists
                existing_dest = Destination.query.filter_by(name=island_name).first()
                if not existing_dest:
                    # Create new destination
                    new_dest = Destination(
                        name=island_name,
                        is_popular=False,
                        display_order=0
                    )
                    db.session.add(new_dest)
                
                # Check if island exists in Island table, if not add it
                # Parse island name to extract atoll and name
                if '.' in island_name:
                    atoll, name = island_name.split('.', 1)
                    existing_island = Island.query.filter_by(atoll=atoll, name=name).first()
                    if not existing_island:
                        # Add new island to Island table
                        new_island = Island(
                            atoll=atoll,
                            name=name,
                            alt_name=None,
                            latitude=None,
                            longitude=None,
                            flags=None
                        )
                        db.session.add(new_island)
                else:
                    # If no atoll specified, try to find by name only
                    existing_island = Island.query.filter_by(name=island_name).first()
                    if not existing_island:
                        # Add as generic island
                        new_island = Island(
                            atoll='Unknown',
                            name=island_name,
                            alt_name=None,
                            latitude=None,
                            longitude=None,
                            flags=None
                        )
                        db.session.add(new_island)
            
            db.session.commit()
            
            # Generate name if not provided
            if not schedule_name:
                dest_names = [dest['island_name'] for dest in destinations]
                if len(dest_names) > 1:
                    schedule_name = f"{', '.join(dest_names[:-1])} to {dest_names[-1]}"
                else:
                    schedule_name = f"{dest_names[0]} Trip"
            
            # Save destinations to session for Step 5
            session['destinations'] = destinations
            session['schedule_name'] = schedule_name
            
            return jsonify({
                'message': 'Destinations saved successfully',
                'redirect': url_for('scheduling.schedule_options')
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to create schedule: {str(e)}'}), 500
    
    # Get all islands for auto-complete
    all_islands = Island.query.filter_by(is_active=True).order_by(Island.name).all()
    
    # Get recent schedule names for auto-fill
    recent_names = db.session.query(Schedule.name).filter_by(owner_id=current_user.id).distinct().limit(10).all()
    recent_names = [name[0] for name in recent_names]
    
    # Get recent destination names for auto-fill
    recent_destinations = db.session.query(ScheduleDestination.island_name).filter(
        ScheduleDestination.schedule_id.in_(
            db.session.query(Schedule.id).filter_by(owner_id=current_user.id)
        )
    ).distinct().limit(20).all()
    recent_destinations = [dest[0] for dest in recent_destinations]
    
    # Check if we're in edit mode
    edit_mode = session.get('edit_mode', False)
    edit_schedule_id = session.get('edit_schedule_id')
    preloaded_destinations = session.get('destinations', [])
    preloaded_schedule_name = session.get('schedule_name', '')
    
    return render_template('scheduling/set_destinations.html', 
                         all_islands=all_islands, 
                         recent_names=recent_names,
                         recent_destinations=recent_destinations,
                         edit_mode=edit_mode,
                         edit_schedule_id=edit_schedule_id,
                         preloaded_destinations=preloaded_destinations,
                         preloaded_schedule_name=preloaded_schedule_name)

@scheduling_bp.route('/schedule-options', methods=['GET', 'POST'])
@login_required
def schedule_options():
    """Step 5: Schedule options (templates and repetition)"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied. Only boat owners can create schedules.'}), 403
    
    from flask import session
    
    if request.method == 'POST':
        data = request.get_json()
        save_as_template = data.get('save_as_template', False)
        template_name = data.get('template_name', '')
        repeat_schedule = data.get('repeat_schedule', False)
        selected_dates = data.get('selected_dates', '')
        confirmation_type = data.get('confirmation_type', 'immediate')
        is_public = data.get('is_public', True)
        # New unified pricing fields
        public_ticket_type_ids = data.get('public_ticket_type_ids', [])
        agent_ticket_type_ids = data.get('agent_ticket_type_ids', [])
        tax_profile_id = data.get('tax_profile_id')
        
        try:
            # Check if we're in edit mode
            edit_mode = session.get('edit_mode', False)
            edit_schedule_id = session.get('edit_schedule_id')
            
            # Debug: Print session data
            print(f"DEBUG: Session data - edit_mode: {edit_mode}, edit_schedule_id: {edit_schedule_id}")
            print(f"DEBUG: Session keys: {list(session.keys())}")
            
            # Get the schedule data from session
            schedule_date = datetime.strptime(session['schedule_date'], '%Y-%m-%d').date()
            boat_id = session['selected_boat_id']
            boat = Boat.query.get(boat_id)
            destinations = session.get('destinations', [])
            blocked_seats = session.get('blocked_seats', [])
            blocked_count = session.get('blocked_count', 0)
            schedule_name = session.get('schedule_name', '')
            
            if edit_mode and edit_schedule_id:
                # Update existing schedule
                schedule = Schedule.query.get(edit_schedule_id)
                if not schedule or schedule.owner_id != current_user.id:
                    return jsonify({'error': 'Schedule not found or access denied'}), 403
                
                # Update schedule fields
                schedule.name = schedule_name
                schedule.confirmation_type = confirmation_type
                schedule.is_public = is_public
                schedule.tax_profile_id = tax_profile_id if tax_profile_id else None
                schedule.available_seats = boat.total_seats - blocked_count
                
                # Clear existing related data
                from models.unified_booking import ScheduleTicketType
                ScheduleTicketType.query.filter_by(schedule_id=schedule.id).delete()
                ScheduleDestination.query.filter_by(schedule_id=schedule.id).delete()
                ScheduleSeat.query.filter_by(schedule_id=schedule.id).delete()
                
            else:
                # Create new schedule
                schedule = Schedule(
                    name=schedule_name,
                    boat_id=boat_id,
                    owner_id=current_user.id,
                    schedule_date=schedule_date,
                    total_seats=boat.total_seats,
                    available_seats=boat.total_seats - blocked_count,
                    confirmation_type=confirmation_type,
                    is_public=is_public,
                    tax_profile_id=tax_profile_id if tax_profile_id else None
                )
            db.session.add(schedule)
            db.session.flush()
            
            # Add ticket types to schedule (public and agent)
            from models.unified_booking import ScheduleTicketType
            
            # Add public ticket types
            if public_ticket_type_ids:
                for ticket_type_id in public_ticket_type_ids:
                    schedule_ticket_type = ScheduleTicketType(
                        schedule_id=schedule.id,
                        ticket_type_id=ticket_type_id,
                        surcharge=0,  # Default no surcharge
                        discount=0,   # Default no discount
                        active=True,
                        channel='PUBLIC'  # Mark as public ticket type
                    )
                    db.session.add(schedule_ticket_type)
            
            # Add agent ticket types
            if agent_ticket_type_ids:
                for ticket_type_id in agent_ticket_type_ids:
                    schedule_ticket_type = ScheduleTicketType(
                        schedule_id=schedule.id,
                        ticket_type_id=ticket_type_id,
                        surcharge=0,  # Default no surcharge
                        discount=0,   # Default no discount
                        active=True,
                        channel='AGENT'  # Mark as agent ticket type
                    )
                    db.session.add(schedule_ticket_type)
            
            # Add destinations
            for i, dest_data in enumerate(destinations):
                departure_time = None
                arrival_time = None
                
                if dest_data.get('departure_time'):
                    departure_time = datetime.strptime(dest_data['departure_time'], '%H:%M').time()
                
                if dest_data.get('arrival_time'):
                    arrival_time = datetime.strptime(dest_data['arrival_time'], '%H:%M').time()
                
                destination = ScheduleDestination(
                    schedule_id=schedule.id,
                    island_name=dest_data['island_name'],
                    sequence_order=i + 1,
                    departure_time=departure_time,
                    arrival_time=arrival_time,
                    is_pickup=dest_data.get('is_pickup', True),
                    is_dropoff=dest_data.get('is_dropoff', True)
                )
                db.session.add(destination)
            
            # Add blocked seats
            for seat_data in blocked_seats:
                blocked_seat = ScheduleSeat(
                    schedule_id=schedule.id,
                    seat_number=seat_data['seat_number'],
                    is_blocked=True,
                    reason=seat_data.get('reason', 'Owner reserved')
                )
                db.session.add(blocked_seat)
            
            # Handle schedule repetition
            if repeat_schedule and selected_dates:
                # Parse selected dates and create additional schedules
                date_list = selected_dates.split(',') if selected_dates else []
                for date_str in date_list:
                    if date_str.strip():
                        try:
                            repeat_date = datetime.strptime(date_str.strip(), '%Y-%m-%d').date()
                            # Create additional schedule for each selected date
                            repeat_schedule_obj = Schedule(
                                name=schedule_name,
                                boat_id=boat_id,
                                owner_id=current_user.id,
                                schedule_date=repeat_date,
                                total_seats=boat.total_seats,
                                available_seats=boat.total_seats - blocked_count,
                                confirmation_type=confirmation_type,
                                is_public=is_public,
                                tax_profile_id=tax_profile_id if tax_profile_id else None
                            )
                            db.session.add(repeat_schedule_obj)
                            db.session.flush()
                            
                            # Add ticket types to repeat schedule (public and agent)
                            # Add public ticket types
                            if public_ticket_type_ids:
                                for ticket_type_id in public_ticket_type_ids:
                                    repeat_schedule_ticket_type = ScheduleTicketType(
                                        schedule_id=repeat_schedule_obj.id,
                                        ticket_type_id=ticket_type_id,
                                        surcharge=0,  # Default no surcharge
                                        discount=0,   # Default no discount
                                        active=True,
                                        channel='PUBLIC'  # Mark as public ticket type
                                    )
                                    db.session.add(repeat_schedule_ticket_type)
                            
                            # Add agent ticket types
                            if agent_ticket_type_ids:
                                for ticket_type_id in agent_ticket_type_ids:
                                    repeat_schedule_ticket_type = ScheduleTicketType(
                                        schedule_id=repeat_schedule_obj.id,
                                        ticket_type_id=ticket_type_id,
                                        surcharge=0,  # Default no surcharge
                                        discount=0,   # Default no discount
                                        active=True,
                                        channel='AGENT'  # Mark as agent ticket type
                                    )
                                    db.session.add(repeat_schedule_ticket_type)
                            
                            # Add destinations to repeat schedule
                            for i, dest_data in enumerate(destinations):
                                departure_time = None
                                arrival_time = None
                                
                                if dest_data.get('departure_time'):
                                    departure_time = datetime.strptime(dest_data['departure_time'], '%H:%M').time()
                                
                                if dest_data.get('arrival_time'):
                                    arrival_time = datetime.strptime(dest_data['arrival_time'], '%H:%M').time()
                                
                                destination = ScheduleDestination(
                                    schedule_id=repeat_schedule_obj.id,
                                    island_name=dest_data['island_name'],
                                    sequence_order=i + 1,
                                    departure_time=departure_time,
                                    arrival_time=arrival_time,
                                    is_pickup=dest_data.get('is_pickup', True),
                                    is_dropoff=dest_data.get('is_dropoff', True)
                                )
                                db.session.add(destination)
                            
                            # Add blocked seats to repeat schedule
                            for seat_data in blocked_seats:
                                blocked_seat = ScheduleSeat(
                                    schedule_id=repeat_schedule_obj.id,
                                    seat_number=seat_data['seat_number'],
                                    is_blocked=True,
                                    reason=seat_data.get('reason', 'Owner reserved')
                                )
                                db.session.add(blocked_seat)
                        except ValueError:
                            # Skip invalid dates
                            continue
            
            # Handle template saving
            if save_as_template and template_name:
                # Save as template (simplified implementation)
                pass
            
            # If editing, clear the edit session data
            if edit_mode:
                session.pop('edit_mode', None)
                session.pop('edit_schedule_id', None)
                session.pop('public_ticket_type_ids', None)
                session.pop('agent_ticket_type_ids', None)
                session.pop('tax_profile_id', None)
            
            db.session.commit()
            
            # Clear session data only after successful creation/update
            session.pop('schedule_date', None)
            session.pop('selected_boat_id', None)
            session.pop('selected_boat_name', None)
            session.pop('selected_boat_seats', None)
            session.pop('blocked_seats', None)
            session.pop('blocked_count', None)
            session.pop('destinations', None)
            session.pop('schedule_name', None)
            
            # Clear edit mode data if editing
            if edit_mode:
                session.pop('edit_mode', None)
                session.pop('edit_schedule_id', None)
                session.pop('public_ticket_type_ids', None)
                session.pop('agent_ticket_type_ids', None)
                session.pop('tax_profile_id', None)
            
            message = 'Schedule updated successfully' if edit_mode else 'Schedule created successfully'
            return jsonify({
                'message': message,
                'redirect': url_for('scheduling.view_schedule', schedule_id=schedule.id)
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to create schedule: {str(e)}'}), 500
    
    # Get schedule data from session for display
    schedule_date = session.get('schedule_date')
    boat_id = session.get('selected_boat_id')
    destinations = session.get('destinations', [])
    blocked_count = session.get('blocked_count', 0)
    schedule_name = session.get('schedule_name', '')
    
    if not schedule_date or not boat_id:
        flash('Please complete previous steps first', 'warning')
        return redirect(url_for('scheduling.create_schedule'))
    
    boat = Boat.query.get(boat_id)
    
    # Check if we're in edit mode
    edit_mode = session.get('edit_mode', False)
    edit_schedule_id = session.get('edit_schedule_id')
    
    return render_template('scheduling/schedule_options.html',
                         schedule_name=schedule_name,
                         schedule_date=schedule_date,
                         boat_name=boat.name if boat else '',
                         total_seats=boat.total_seats if boat else 0,
                         blocked_count=blocked_count,
                         destination_count=len(destinations),
                         edit_mode=edit_mode,
                         edit_schedule_id=edit_schedule_id,
                         public_ticket_type_ids=session.get('public_ticket_type_ids', []),
                         agent_ticket_type_ids=session.get('agent_ticket_type_ids', []),
                         tax_profile_id=session.get('tax_profile_id'))

@scheduling_bp.route('/<int:schedule_id>')
@login_required
def view_schedule(schedule_id):
    """View a specific schedule"""
    schedule = Schedule.query.get_or_404(schedule_id)
    
    if schedule.owner_id != current_user.id:
        flash('Access denied.', 'error')
        return redirect(url_for('scheduling.schedules'))
    
    return render_template('scheduling/view_schedule.html', schedule=schedule)


@scheduling_bp.route('/<int:schedule_id>/seat-map', methods=['GET'])
@login_required
def get_seat_map(schedule_id):
    schedule = Schedule.query.get_or_404(schedule_id)
    if schedule.owner_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    boat = schedule.boat
    seat_map = None
    if boat.seating_type == 'chart' and boat.seating_chart:
        try:
            seat_map = json.loads(boat.seating_chart)
        except Exception:
            seat_map = None
    # Collect currently booked and blocked seats
    blocked = [s.seat_number for s in schedule.seats if s.is_blocked]
    
    # Use unified booking system to get booked seats
    from models.unified_booking import SeatAssignment
    booked_seats = SeatAssignment.query.join(
        SeatAssignment.booking
    ).filter(
        SeatAssignment.booking.has(schedule_id=schedule.id)
    ).all()
    booked = [bs.seat_no for bs in booked_seats]
    
    # Remove booked seats from blocked list (since they're now booked, not just blocked)
    blocked = [seat for seat in blocked if seat not in booked]
    
    print(f"DEBUG: Schedule {schedule_id} - Unified query found {len(booked_seats)} booked seats: {booked}")
    print(f"DEBUG: Schedule {schedule_id} - Blocked seats (excluding booked): {blocked}")
    print(f"DEBUG: Schedule {schedule_id} - Booked seats: {booked}")
    print(f"DEBUG: Total booked seats found: {len(booked)}")
    # Allow blocked seats for owner (of this boat) or agent users
    allow_blocked = False
    if current_user.role == 'owner' and schedule.owner_id == current_user.id:
        allow_blocked = True
    elif current_user.role == 'agent':
        allow_blocked = True
    connections = []
    if current_user.role == 'agent':
        conns = OwnerAgentConnection.query.filter_by(agent_id=current_user.id, status='approved').all()
        for c in conns:
            connections.append({'owner_id': c.owner_id, 'owner_name': c.owner.name, 'currency': c.currency})
    elif current_user.role == 'owner' and schedule.owner_id == current_user.id:
        # For owners, get their connected agents
        conns = OwnerAgentConnection.query.filter_by(owner_id=current_user.id, status='approved').all()
        for c in conns:
            connections.append({'owner_id': c.agent_id, 'owner_name': c.agent.name, 'currency': c.currency})
    return jsonify({'seating_type': boat.seating_type, 'seat_map': seat_map, 'blocked': blocked, 'booked': booked, 'allow_blocked': allow_blocked, 'connections': connections})


@scheduling_bp.route('/<int:schedule_id>/book', methods=['GET', 'POST'])
@login_required
def create_booking(schedule_id):
    schedule = Schedule.query.get_or_404(schedule_id)
    
    if request.method == 'GET':
        # Show unified booking form
        return render_template('unified_booking_form.html', schedule=schedule)
    
    # POST: Create booking using unified system
    try:
        data = request.get_json()
        
        # Check access based on user role
        user_role = current_user.role
        schedule_owner_id = schedule.owner_id
        
        if user_role == 'owner' and current_user.id != schedule_owner_id:
            return jsonify({'error': 'Access denied. You can only book on your own boats.'}), 403
        
        if user_role == 'agent':
            # Check if agent has access to this boat
            from models.owner_settings import OwnerAgentConnection
            connection = OwnerAgentConnection.query.filter_by(
                owner_id=schedule_owner_id,
                agent_id=current_user.id,
                status='approved'
            ).first()
            
            if not connection:
                return jsonify({'error': 'Access denied. You do not have permission to book on this boat.'}), 403
        
        # Create unified booking
        from models.unified_booking import Booking, BookingTicket, SeatAssignment
        from models.unified_booking import TicketType, ScheduleTicketType
        
        # Generate unique booking code
        booking_code = Booking.generate_code()
        
        # Get ticket type details
        ticket_type_id = data.get('ticket_type_id')
        if not ticket_type_id:
            return jsonify({'error': 'Ticket type is required'}), 400
        
        ticket_type = TicketType.query.get(ticket_type_id)
        if not ticket_type or not ticket_type.active:
            return jsonify({'error': 'Invalid ticket type'}), 400
        
        # Calculate pricing
        schedule_ticket_type = ScheduleTicketType.query.filter_by(
            schedule_id=schedule_id,
            ticket_type_id=ticket_type_id
        ).first()
        
        base_price = float(ticket_type.base_price)
        surcharge = float(schedule_ticket_type.surcharge) if schedule_ticket_type else 0
        discount = float(schedule_ticket_type.discount) if schedule_ticket_type else 0
        
        # Calculate total for selected seats
        selected_seats = data.get('seats', [])
        if not selected_seats:
            return jsonify({'error': 'At least one seat must be selected'}), 400
        
        seat_count = len(selected_seats)
        subtotal = (base_price + surcharge - discount) * seat_count
        
        # Get route information
        pickup_destination_id = data.get('pickup_destination_id')
        dropoff_destination_id = data.get('dropoff_destination_id')
        
        if not pickup_destination_id or not dropoff_destination_id:
            return jsonify({'error': 'Pickup and dropoff destinations are required'}), 400
        
        # Validate route logic
        from models.scheduling import ScheduleDestination
        pickup_dest = ScheduleDestination.query.get(pickup_destination_id)
        dropoff_dest = ScheduleDestination.query.get(dropoff_destination_id)
        
        if not pickup_dest or not dropoff_dest:
            return jsonify({'error': 'Invalid pickup or dropoff destination'}), 400
        
        if pickup_dest.schedule_id != schedule_id or dropoff_dest.schedule_id != schedule_id:
            return jsonify({'error': 'Destinations must belong to the selected schedule'}), 400
        
        if pickup_dest.sequence_order >= dropoff_dest.sequence_order:
            return jsonify({'error': 'Dropoff point must be after pickup point in the route'}), 400
        
        # Calculate actual departure time for the selected route segment
        departure_time = None
        if pickup_dest.departure_time:
            from datetime import datetime, time
            if isinstance(pickup_dest.departure_time, str):
                # Parse string to datetime if needed
                try:
                    time_obj = datetime.strptime(pickup_dest.departure_time, '%H:%M:%S').time()
                    departure_time = datetime.combine(schedule.schedule_date, time_obj)
                except ValueError:
                    departure_time = None
            elif isinstance(pickup_dest.departure_time, time):
                # If it's a time object, combine with schedule date
                departure_time = datetime.combine(schedule.schedule_date, pickup_dest.departure_time)
            elif isinstance(pickup_dest.departure_time, datetime):
                # If it's already a datetime, use it
                departure_time = pickup_dest.departure_time
            else:
                # Fallback: create datetime from schedule date and default time
                departure_time = datetime.combine(schedule.schedule_date, time(6, 0))  # Default 6:00 AM
        else:
            # No departure time set, use default
            from datetime import datetime, time
            departure_time = datetime.combine(schedule.schedule_date, time(6, 0))  # Default 6:00 AM
        
        # Create booking
        booking = Booking(
            code=booking_code,
            owner_id=schedule_owner_id,
            schedule_id=schedule_id,
            channel=data.get('channel', 'PUBLIC'),
            created_by_user_id=current_user.id,
            agent_id=data.get('agent_id'),  # Will be set for agent bookings
            buyer_name=data.get('buyer_name', current_user.name),
            buyer_phone=data.get('buyer_phone', current_user.phone),
            pickup_destination_id=pickup_destination_id,
            dropoff_destination_id=dropoff_destination_id,
            departure_time=departure_time,
            line_items=[{
                'type': 'ticket',
                'description': f'{ticket_type.name} x {seat_count}',
                'unit_price': base_price + surcharge - discount,
                'quantity': seat_count,
                'total': subtotal
            }],
            subtotal=subtotal,
            tax_total=0,  # Will be calculated if tax profile exists
            discount_total=discount * seat_count,
            grand_total=subtotal,
            currency=data.get('currency', 'MVR'),
            meta={
                'notes': data.get('notes', ''),
                'request_source': 'web_booking',
                'user_agent': request.headers.get('User-Agent', ''),
                'ip_address': request.remote_addr
            }
        )
        
        db.session.add(booking)
        db.session.flush()  # Get booking ID
        
        # Create tickets and seat assignments
        for seat_no in selected_seats:
            ticket = BookingTicket(
                booking_id=booking.id,
                ticket_type_id=ticket_type_id,
                passenger_name=data.get('buyer_name', current_user.name),
                passenger_phone=data.get('buyer_phone', current_user.phone),
                fare_base_price_snapshot=base_price + surcharge - discount,
                seat_no=seat_no
            )
            db.session.add(ticket)
            db.session.flush()  # Get the ticket ID
            
            # Create seat assignment with the ticket ID
            seat_assignment = SeatAssignment(
                booking_id=booking.id,
                ticket_id=ticket.id,  # Now ticket.id exists
                seat_no=seat_no,
                assigned_by=current_user.id
            )
            db.session.add(seat_assignment)
        
        # Handle agent immediate confirmation if applicable
        if user_role == 'agent' and data.get('confirmation_type') == 'immediate':
            booking.fulfillment_status = 'CONFIRMED'
            # TODO: Add logic for agent receivable to owner
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Booking created successfully',
            'booking': {
                'id': booking.id,
                'code': booking.code,
                'grand_total': float(booking.grand_total),
                'seats': selected_seats
            }
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create booking: {str(e)}'}), 500


@scheduling_bp.route('/<int:schedule_id>/bookings', methods=['GET'])
@login_required
def get_schedule_bookings(schedule_id):
    """Get all bookings for a schedule using unified booking system"""
    schedule = Schedule.query.get_or_404(schedule_id)
    if schedule.owner_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    
    # Get unified bookings for this schedule
    from models.unified_booking import Booking, BookingTicket, SeatAssignment
    from models.unified_booking import TicketType, ScheduleTicketType
    
    bookings = Booking.query.filter_by(schedule_id=schedule.id).order_by(Booking.created_at.desc()).all()
    
    booking_list = []
    for booking in bookings:
        # Get seat assignments for this booking
        seat_assignments = SeatAssignment.query.filter_by(booking_id=booking.id).all()
        seats = [sa.seat_no for sa in seat_assignments]
        seat_count = len(seats)
        
        # Get ticket type details
        ticket_type_name = "Unknown"
        ticket_price = 0
        if booking.tickets:
            first_ticket = booking.tickets[0]
            ticket_type = TicketType.query.get(first_ticket.ticket_type_id)
            if ticket_type:
                ticket_type_name = ticket_type.name
                ticket_price = float(ticket_type.base_price)
        
        # Get notes from meta field
        notes = ""
        if booking.meta and isinstance(booking.meta, dict):
            notes = booking.meta.get('notes', '')
        
        # Determine status based on fulfillment and payment
        status = 'pending'
        if booking.fulfillment_status == 'CONFIRMED':
            status = 'confirmed'
        elif booking.payment_status == 'PAID':
            status = 'paid'
        elif booking.fulfillment_status == 'CANCELLED':
            status = 'cancelled'
        
        # Get route information
        route_info = "Full route"
        if booking.pickup_destination and booking.dropoff_destination:
            route_info = f"{booking.pickup_destination.island_name} → {booking.dropoff_destination.island_name}"
        
        booking_data = {
            'id': booking.id,
            'booking_ref': booking.code,  # Use unified booking code
            'customer_type': 'public' if booking.channel == 'PUBLIC' else 'agent',
            'price_type': 'priced' if float(booking.grand_total) > 0 else 'complimentary',
            'ticket_price': ticket_price,
            'total_amount': float(booking.grand_total),
            'currency': booking.currency,
            'route': route_info,
            'contact_phone': booking.buyer_phone,
            'contact_name': booking.buyer_name,
            'agent_name': None,  # Will be populated if agent booking
            'notes': notes,
            'seats': seats,
            'seat_count': seat_count,
            'created_at': booking.created_at.strftime('%Y-%m-%d %H:%M') if booking.created_at else 'N/A',
            'status': status
        }
        
        # Add agent name if this is an agent booking
        if booking.agent_id and booking.channel == 'AGENT':
            from models.owner_settings import OwnerAgentConnection
            connection = OwnerAgentConnection.query.filter_by(
                owner_id=schedule.owner_id,
                agent_id=booking.agent_id
            ).first()
            if connection:
                booking_data['agent_name'] = connection.agent.name
                # For agent bookings, show agent as the contact
                booking_data['contact_name'] = connection.agent.name
                booking_data['contact_phone'] = connection.agent.phone
        else:
            # For public bookings, show the actual passenger details
            booking_data['contact_name'] = booking.buyer_name
            booking_data['contact_phone'] = booking.buyer_phone
        
        booking_list.append(booking_data)
    
    return jsonify({'bookings': booking_list})


@scheduling_bp.route('/<int:schedule_id>/bookings/<int:booking_id>/cancel', methods=['POST'])
@login_required
def cancel_booking(schedule_id, booking_id):
    """Cancel entire booking or remove specific seats"""
    schedule = Schedule.query.get_or_404(schedule_id)
    if schedule.owner_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    
    try:
        data = request.get_json() or {}
        seats_to_remove = data.get('seats', [])  # If empty, cancel entire booking
        
        # Get unified booking
        from models.unified_booking import Booking, SeatAssignment
        booking = Booking.query.get_or_404(booking_id)
        
        if booking.schedule_id != schedule.id:
            return jsonify({'error': 'Invalid booking for this schedule'}), 400
        
        if not seats_to_remove:
            # Cancel entire booking
            seat_count = len(booking.seat_assignments)
            
            # Delete the booking (cascade will handle seat assignments and tickets)
            db.session.delete(booking)
            
            # Update available seats
            schedule.available_seats = min(schedule.total_seats, schedule.available_seats + seat_count)
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Entire booking cancelled successfully',
                'seats_freed': seat_count
            })
            
        else:
            # Remove specific seats only
            current_seats = [sa.seat_no for sa in booking.seat_assignments]
            seats_to_remove = [seat for seat in seats_to_remove if seat in current_seats]
            
            if not seats_to_remove:
                return jsonify({'error': 'No valid seats to remove'}), 400
            
            # Remove specific seat assignments
            seats_to_delete = SeatAssignment.query.filter(
                SeatAssignment.booking_id == booking_id,
                SeatAssignment.seat_no.in_(seats_to_remove)
            ).all()
            
            for seat_assignment in seats_to_delete:
                db.session.delete(seat_assignment)
            
            # Remove corresponding tickets
            from models.unified_booking import BookingTicket
            tickets_to_delete = BookingTicket.query.filter(
                BookingTicket.booking_id == booking_id,
                BookingTicket.seat_no.in_(seats_to_remove)
            ).all()
            
            for ticket in tickets_to_delete:
                db.session.delete(ticket)
            
            # Update booking totals
            remaining_seats = [sa.seat_no for sa in booking.seat_assignments if sa.seat_no not in seats_to_remove]
            remaining_count = len(remaining_seats)
            
            if remaining_count == 0:
                # No seats left, cancel entire booking
                db.session.delete(booking)
                message = 'All seats removed, booking cancelled'
            else:
                # Update booking with remaining seats
                # Recalculate totals based on remaining seats
                from models.unified_booking import TicketType
                from decimal import Decimal
                
                if booking.tickets:
                    first_ticket = booking.tickets[0]
                    ticket_type = TicketType.query.get(first_ticket.ticket_type_id)
                    if ticket_type:
                        # Convert to Decimal for consistent arithmetic
                        base_price = Decimal(str(ticket_type.base_price))
                        # Recalculate subtotal, tax, and grand total
                        booking.subtotal = base_price * remaining_count
                        # Note: Tax recalculation would need tax profile logic
                        # Ensure all values are Decimal for arithmetic
                        tax_total = Decimal(str(booking.tax_total)) if booking.tax_total else Decimal('0')
                        discount_total = Decimal(str(booking.discount_total)) if booking.discount_total else Decimal('0')
                        booking.grand_total = booking.subtotal + tax_total - discount_total
                
                message = f'{len(seats_to_remove)} seats removed from booking'
            
            # Update available seats
            schedule.available_seats = min(schedule.total_seats, schedule.available_seats + len(seats_to_remove))
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': message,
                'seats_removed': seats_to_remove,
                'remaining_seats': remaining_seats,
                'remaining_count': remaining_count,
                'seats_freed': len(seats_to_remove)
            })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to cancel/update booking: {str(e)}'}), 500


@scheduling_bp.route('/<int:schedule_id>/bookings/<int:booking_id>/issue-ticket', methods=['POST'])
@login_required
def issue_ticket(schedule_id, booking_id):
    """Issue ticket and confirm payment received using unified booking system"""
    try:
        schedule = Schedule.query.get_or_404(schedule_id)
        if schedule.owner_id != current_user.id:
            return jsonify({'error': 'Access denied.'}), 403
        
        # Get unified booking
        from models.unified_booking import Booking, BookingTicket, SeatAssignment
        from models.unified_booking import TicketType, ScheduleTicketType
        
        booking = Booking.query.get_or_404(booking_id)
        if booking.schedule_id != schedule.id:
            return jsonify({'error': 'Invalid booking for this schedule'}), 400
        
        data = request.get_json()
        payment_method = data.get('payment_method')
        reference_number = data.get('reference_number', '')
        notes = data.get('notes', '')
        
        if not payment_method:
            return jsonify({'error': 'Payment method is required'}), 400
        
        if payment_method not in ['bank_transfer', 'cash']:
            return jsonify({'error': 'Invalid payment method. Only bank_transfer or cash allowed'}), 400
        
        # Get booking details from unified system
        seat_count = len(booking.seat_assignments)
        if seat_count == 0:
            return jsonify({'error': 'No seats found for this booking'}), 400
        
        # Get ticket type and pricing
        if not booking.tickets:
            return jsonify({'error': 'No tickets found for this booking'}), 400
        
        first_ticket = booking.tickets[0]
        ticket_type = TicketType.query.get(first_ticket.ticket_type_id)
        if not ticket_type:
            return jsonify({'error': 'Ticket type not found'}), 400
        
        # Calculate amounts - ensure consistent decimal types
        from decimal import Decimal
        
        base_price = Decimal(str(ticket_type.base_price))
        total_amount = Decimal(str(booking.grand_total))
        
        print(f"DEBUG: Seat count: {seat_count}, Base price: {base_price}, Total: {total_amount}")
        
        # Get app owner commission rate
        from models.owner_settings import AppOwnerSettings
        app_settings = AppOwnerSettings.query.filter_by(is_active=True).first()
        if not app_settings:
            # Create default app settings if none exist
            app_settings = AppOwnerSettings()
            db.session.add(app_settings)
            db.session.flush()
        
        commission_amount = Decimal(str(app_settings.commission_rate))
        owner_amount = total_amount - commission_amount
        
        # Create payment transaction record
        from models.owner_settings import PaymentTransaction
        transaction = PaymentTransaction(
            booking_id=booking.id,
            schedule_id=schedule.id,
            owner_id=current_user.id,
            amount=total_amount,
            currency=booking.currency,
            payment_method=payment_method,
            payment_status='completed',
            payment_reference=reference_number,
            payment_notes=notes
        )
        db.session.add(transaction)
        db.session.flush()
        
        # Create commission ledger entries
        from models.owner_settings import CommissionLedger
        
        try:
            # Get current running balance for app owner
            app_owner_balance = db.session.query(db.func.coalesce(
                db.session.query(CommissionLedger.running_balance)
                .filter_by(to_app_owner=True)
                .order_by(CommissionLedger.id.desc())
                .limit(1)
                .scalar(), 0
            )).scalar()
            
            # Get current running balance for boat owner
            owner_balance = db.session.query(db.func.coalesce(
                db.session.query(CommissionLedger.running_balance)
                .filter_by(from_owner_id=current_user.id, to_app_owner=False)
                .order_by(CommissionLedger.id.desc())
                .limit(1)
                .scalar(), 0
            )).scalar()
            
            print(f"DEBUG: App owner balance: {app_owner_balance}, Owner balance: {owner_balance}")
            print(f"DEBUG: Commission amount: {commission_amount}, Type: {type(commission_amount)}")
            
            # App owner receives commission (credit)
            app_owner_entry = CommissionLedger(
                transaction_id=transaction.id,
                commission_amount=commission_amount,
                currency=booking.currency,
                from_owner_id=current_user.id,
                to_app_owner=True,
                entry_type='credit',
                description=f'Commission from {current_user.name} for booking {booking.code}'[:200],  # Truncate to 200 chars
                running_balance=Decimal(str(app_owner_balance)) + commission_amount
            )
            print(f"DEBUG: Creating app owner entry: {app_owner_entry.__dict__}")
            db.session.add(app_owner_entry)
            
            # Boat owner pays commission (debit)
            owner_entry = CommissionLedger(
                transaction_id=transaction.id,
                commission_amount=commission_amount,
                currency=booking.currency,
                from_owner_id=current_user.id,
                to_app_owner=False,
                entry_type='debit',
                description=f'Commission paid to app owner for booking {booking.code}'[:200],  # Truncate to 200 chars
                running_balance=Decimal(str(owner_balance)) - commission_amount
            )
            print(f"DEBUG: Creating owner entry: {owner_entry.__dict__}")
            db.session.add(owner_entry)
            
            print("DEBUG: Both ledger entries added to session successfully")
            
        except Exception as ledger_error:
            print(f"DEBUG: Error creating ledger entries: {str(ledger_error)}")
            raise ledger_error
        
        # Handle agent vs public booking accounting
        if booking.channel == 'AGENT' and booking.agent_id:
            # Agent booking - create agent payable to owner
            from models.owner_settings import OwnerAgentConnection
            
            # Get agent connection details
            agent_connection = OwnerAgentConnection.query.filter_by(
                owner_id=current_user.id,
                agent_id=booking.agent_id
            ).first()
            
            if agent_connection:
                # Update agent's current balance (they owe this amount to owner)
                agent_connection.current_balance = Decimal(str(agent_connection.current_balance or 0)) + total_amount
                
                # Create agent ledger entry for payable to owner
                agent_payable_entry = CommissionLedger(
                    transaction_id=transaction.id,
                    commission_amount=total_amount,
                    currency=booking.currency,
                    from_owner_id=current_user.id,
                    to_app_owner=False,
                    entry_type='credit',  # Agent owes this to owner
                    description=f'Agent {agent_connection.agent.name} owes {total_amount} {booking.currency} for booking {booking.code}'[:200],  # Truncate to 200 chars
                    running_balance=agent_connection.current_balance
                )
                db.session.add(agent_payable_entry)
                
                print(f"DEBUG: Agent {agent_connection.agent.name} balance updated: +{total_amount} = {agent_connection.current_balance}")
        
        # Update booking status to confirmed/paid
        booking.payment_status = 'PAID'
        booking.fulfillment_status = 'CONFIRMED'
        booking.meta = booking.meta or {}
        booking.meta['ticket_issued_at'] = datetime.utcnow().isoformat()
        booking.meta['payment_transaction_id'] = transaction.id
        
        db.session.commit()
        
        public_url = url_for('scheduling.view_public_ticket', booking_code=booking.code, _external=True)
        print(f"DEBUG: Generated public URL: {public_url}")
        
        return jsonify({
            'success': True,
            'message': 'Ticket issued successfully',
            'booking_ref': booking.code,
            'transaction_id': transaction.id,
            'commission_amount': float(commission_amount),
            'owner_amount': float(owner_amount),
            'total_amount': float(total_amount),
            'channel': booking.channel,
            'agent_name': agent_connection.agent.name if booking.channel == 'AGENT' and 'agent_connection' in locals() else None,
            'public_url': public_url
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: Error issuing ticket: {str(e)}")
        return jsonify({'error': f'Failed to issue ticket: {str(e)}'}), 500

@scheduling_bp.route('/debug/bookings', methods=['GET'])
def debug_bookings():
    """Debug route to check all bookings in database"""
    try:
        from models.unified_booking import Booking
        
        all_bookings = Booking.query.all()
        debug_info = []
        
        for booking in all_bookings:
            debug_info.append({
                'id': booking.id,
                'code': booking.code,
                'payment_status': booking.payment_status,
                'fulfillment_status': booking.fulfillment_status,
                'schedule_id': booking.schedule_id,
                'buyer_name': booking.buyer_name,
                'created_at': str(booking.created_at) if hasattr(booking, 'created_at') else 'N/A'
            })
        
        return jsonify({
            'total_bookings': len(all_bookings),
            'bookings': debug_info
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/ticket/<booking_code>', methods=['GET'])
def view_public_ticket(booking_code):
    """Public route to view ticket details using booking code"""
    try:
        from models.unified_booking import Booking, BookingTicket, SeatAssignment, TicketType
        import qrcode
        import io
        import base64
        
        print(f"DEBUG: Looking for booking with code: {booking_code}")
        
        # Find booking by code
        try:
            # First, let's check if the model is working
            print(f"DEBUG: Booking model class: {type(Booking)}")
            print(f"DEBUG: Database session: {type(db.session)}")
            
            # Try a simple query first
            total_bookings = Booking.query.count()
            print(f"DEBUG: Total bookings in database: {total_bookings}")
            
            # Now try to find the specific booking
            booking = Booking.query.filter_by(code=booking_code).first()
            print(f"DEBUG: Query result: {booking}")
            
            if not booking:
                print(f"DEBUG: No booking found with code: {booking_code}")
                # Let's also check what bookings exist
                all_bookings = Booking.query.all()
                print(f"DEBUG: All bookings: {len(all_bookings)}")
                for b in all_bookings:
                    print(f"DEBUG: Booking ID {b.id}, Code: '{b.code}', Status: {b.payment_status}/{b.fulfillment_status}")
                    if b.code == booking_code:
                        print(f"DEBUG: FOUND MATCHING BOOKING! ID: {b.id}")
                return render_template('scheduling/ticket_not_found.html', booking_code=booking_code)
        except Exception as query_error:
            print(f"DEBUG: Error during database query: {str(query_error)}")
            return render_template('scheduling/ticket_not_found.html', booking_code=booking_code)
        
        print(f"DEBUG: Found booking: {booking.id}, status: {booking.payment_status}/{booking.fulfillment_status}")
        
        # Check if ticket is issued/confirmed
        if booking.payment_status != 'PAID' or booking.fulfillment_status != 'CONFIRMED':
            print(f"DEBUG: Ticket not yet issued. Payment: {booking.payment_status}, Fulfillment: {booking.fulfillment_status}")
            return render_template('scheduling/ticket_not_issued.html', booking_code=booking_code)
        
        # Get schedule details
        schedule = Schedule.query.get(booking.schedule_id)
        if not schedule:
            return render_template('scheduling/ticket_not_found.html', booking_code=booking_code)
        
        # Generate QR code
        try:
            qr_data = {
                'booking_code': booking.code,
                'schedule_id': schedule.id,
                'passenger_name': booking.buyer_name,
                'ticket_url': request.url,
                'issued_at': booking.meta.get('ticket_issued_at') if booking.meta else None
            }
            
            print(f"DEBUG: QR data: {qr_data}")
            
            # Create QR code
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            
            # Convert to JSON string instead of str() to avoid syntax issues
            import json
            qr_string = json.dumps(qr_data, default=str)
            print(f"DEBUG: QR string: {qr_string}")
            
            qr.add_data(qr_string)
            qr.make(fit=True)
            
            # Create QR code image
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            print(f"DEBUG: QR code generated successfully, length: {len(qr_code_base64)}")
            
        except Exception as qr_error:
            print(f"DEBUG: Error generating QR code: {str(qr_error)}")
            # Use a fallback QR code or empty string
            qr_code_base64 = ""
        
        print(f"DEBUG: About to get ticket details...")
        
        # Get ticket details
        tickets_data = []
        try:
            for ticket in booking.tickets:
                print(f"DEBUG: Processing ticket: {ticket.id}")
                seat_assignment = SeatAssignment.query.filter_by(ticket_id=ticket.id).first()
                if seat_assignment:
                    ticket_type = TicketType.query.get(ticket.ticket_type_id)
                    
                    # Format seat number for display (handle count-based boats)
                    display_seat_number = seat_assignment.seat_no
                    if schedule.boat and schedule.boat.seating_type == 'count' and seat_assignment.seat_no.startswith('COUNT_'):
                        # For count-based boats, show just the number
                        display_seat_number = seat_assignment.seat_no.replace('COUNT_', '')
                    
                    tickets_data.append({
                        'seat_number': display_seat_number,
                        'ticket_type_name': ticket_type.name if ticket_type else 'Unknown',
                        'ticket_type_price': float(ticket_type.base_price) if ticket_type else 0,
                        'currency': booking.currency
                    })
                    print(f"DEBUG: Added ticket data: {tickets_data[-1]}")
        except Exception as ticket_error:
            print(f"DEBUG: Error getting ticket details: {str(ticket_error)}")
            tickets_data = []
        
        print(f"DEBUG: Got {len(tickets_data)} tickets")
        
        # Get payment transaction details
        try:
            from models.owner_settings import PaymentTransaction
            payment_transaction = PaymentTransaction.query.filter_by(booking_id=booking.id).first()
            print(f"DEBUG: Payment transaction: {payment_transaction.id if payment_transaction else 'None'}")
        except Exception as payment_error:
            print(f"DEBUG: Error getting payment transaction: {str(payment_error)}")
            payment_transaction = None
        
        # Get agent details if applicable
        agent_name = None
        try:
            if booking.channel == 'AGENT' and booking.agent_id:
                from models.owner_settings import OwnerAgentConnection
                agent_connection = OwnerAgentConnection.query.filter_by(
                    owner_id=schedule.owner_id,
                    agent_id=booking.agent_id
                ).first()
                if agent_connection:
                    agent_name = agent_connection.agent.name
                    print(f"DEBUG: Agent name: {agent_name}")
        except Exception as agent_error:
            print(f"DEBUG: Error getting agent details: {str(agent_error)}")
            agent_name = None
        
        print(f"DEBUG: About to render template...")
        print(f"DEBUG: Template variables: booking={type(booking)}, schedule={type(schedule)}, tickets={len(tickets_data)}, payment={type(payment_transaction)}, agent={agent_name}, qr_length={len(qr_code_base64)}")
        
        try:
            return render_template('scheduling/public_ticket.html', 
                                 booking=booking, 
                                 schedule=schedule, 
                                 tickets=tickets_data,
                                 payment_transaction=payment_transaction,
                                 agent_name=agent_name,
                                 qr_code_base64=qr_code_base64)
        except Exception as template_error:
            print(f"DEBUG: Error rendering template: {str(template_error)}")
            print(f"DEBUG: Template error type: {type(template_error)}")
            import traceback
            traceback.print_exc()
            raise template_error
        
    except Exception as e:
        print(f"Error viewing public ticket: {str(e)}")
        return render_template('scheduling/ticket_not_found.html', booking_code=booking_code)

@scheduling_bp.route('/<int:schedule_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_schedule(schedule_id):
    """Edit an existing schedule - starts from first step with preloaded data"""
    schedule = Schedule.query.get_or_404(schedule_id)
    
    if schedule.owner_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    
    # Check if schedule is in the past
    from datetime import date
    today = date.today()
    
    if request.method == 'POST':
        # This will be handled by the step-by-step flow when editing
        pass
    
    # For GET requests, start edit flow from first step
    from flask import session
    
    # Store schedule data in session for editing
    session['edit_schedule_id'] = schedule_id
    session['edit_mode'] = True
    session['schedule_date'] = schedule.schedule_date.isoformat()
    session['selected_boat_id'] = schedule.boat_id
    session['selected_boat_name'] = schedule.boat.name
    session['selected_boat_seats'] = schedule.boat.total_seats
    session['schedule_name'] = schedule.name
    
    # Store destinations
    destinations = []
    for dest in schedule.destinations:
        destinations.append({
            'island_name': dest.island_name,
            'departure_time': dest.departure_time.strftime('%H:%M') if dest.departure_time else '',
            'arrival_time': dest.arrival_time.strftime('%H:%M') if dest.arrival_time else '',
            'is_pickup': dest.is_pickup,
            'is_dropoff': dest.is_dropoff
        })
    session['destinations'] = destinations
    
    # Store blocked seats
    blocked_seats = []
    for seat in schedule.seats:
        if seat.is_blocked:
            blocked_seats.append({
                'seat_number': seat.seat_number,
                'reason': seat.reason or 'Owner reserved'
            })
    session['blocked_seats'] = blocked_seats
    session['blocked_count'] = len(blocked_seats)
    
    # Store ticket types and tax profile
    from models.unified_booking import ScheduleTicketType
    schedule_ticket_types = ScheduleTicketType.query.filter_by(
        schedule_id=schedule_id,
        active=True
    ).all()
    
    public_ticket_type_ids = []
    agent_ticket_type_ids = []
    for stt in schedule_ticket_types:
        if stt.channel == 'PUBLIC':
            public_ticket_type_ids.append(stt.ticket_type_id)
        elif stt.channel == 'AGENT':
            agent_ticket_type_ids.append(stt.ticket_type_id)
    
    session['public_ticket_type_ids'] = public_ticket_type_ids
    session['agent_ticket_type_ids'] = agent_ticket_type_ids
    session['tax_profile_id'] = schedule.tax_profile_id
    
    # Redirect to first step (create_schedule) in edit mode
    return redirect(url_for('scheduling.create_schedule'))

@scheduling_bp.route('/api/schedules/<int:schedule_id>/issued-tickets', methods=['GET'])
@login_required
def get_schedule_issued_tickets(schedule_id):
    """Get all issued tickets for a specific schedule, grouped by booking"""
    try:
        from models.unified_booking import Booking, BookingTicket, SeatAssignment, TicketType
        from models.owner_settings import PaymentTransaction
        
        schedule = Schedule.query.get_or_404(schedule_id)
        
        # Get all confirmed/paid bookings for this schedule
        confirmed_bookings = Booking.query.filter_by(
            schedule_id=schedule_id,
            payment_status='PAID',
            fulfillment_status='CONFIRMED'
        ).all()
        
        tickets_data = []
        
        for booking in confirmed_bookings:
            # Get payment transaction details
            payment_transaction = PaymentTransaction.query.filter_by(
                booking_id=booking.id
            ).first()
            
            # Get all tickets for this booking
            for ticket in booking.tickets:
                # Get seat assignment for this ticket
                seat_assignment = SeatAssignment.query.filter_by(
                    ticket_id=ticket.id
                ).first()
                
                if seat_assignment:
                    # Get ticket type details
                    ticket_type = TicketType.query.get(ticket.ticket_type_id)
                    
                    # Format seat number for display (handle count-based boats)
                    display_seat_number = seat_assignment.seat_no
                    if schedule.boat and schedule.boat.seating_type == 'count' and seat_assignment.seat_no.startswith('COUNT_'):
                        # For count-based boats, show just the number
                        display_seat_number = seat_assignment.seat_no.replace('COUNT_', '')
                    
                    ticket_data = {
                        'ticket_id': ticket.id,
                        'booking_ref': booking.code,
                        'seat_number': display_seat_number,
                        'passenger_name': booking.buyer_name,
                        'passenger_phone': booking.buyer_phone,
                        'ticket_type_name': ticket_type.name if ticket_type else 'Unknown',
                        'ticket_type_price': float(ticket_type.base_price) if ticket_type else 0,
                        'currency': booking.currency,
                        'issued_at': booking.meta.get('ticket_issued_at') if booking.meta else None,
                        'payment_method': payment_transaction.payment_method if payment_transaction else 'Unknown',
                        'payment_reference': payment_transaction.payment_reference if payment_transaction else '',
                        'channel': booking.channel,
                        'agent_name': None,  # Will be populated for agent bookings
                        'travel_status': seat_assignment.travel_status
                    }
                    
                    # If it's an agent booking, get agent details
                    if booking.channel == 'AGENT' and booking.agent_id:
                        from models.owner_settings import OwnerAgentConnection
                        agent_connection = OwnerAgentConnection.query.filter_by(
                            owner_id=schedule.owner_id,
                            agent_id=booking.agent_id
                        ).first()
                        if agent_connection:
                            ticket_data['agent_name'] = agent_connection.agent.name
                    
                    tickets_data.append(ticket_data)
        
        # Sort by booking reference, then by seat number
        tickets_data.sort(key=lambda x: (x['booking_ref'], x['seat_number']))
        
        return jsonify({
            'success': True,
            'tickets': tickets_data,
            'total_tickets': len(tickets_data)
        })
        
    except Exception as e:
        print(f"Error fetching issued tickets: {str(e)}")
        return jsonify({'error': f'Failed to fetch issued tickets: {str(e)}'}), 500

@scheduling_bp.route('/api/tickets/<int:ticket_id>/mark-travelled', methods=['POST'])
@login_required
def mark_ticket_as_travelled(ticket_id):
    """Mark a ticket as travelled"""
    try:
        from models.unified_booking import BookingTicket, SeatAssignment
        from datetime import datetime
        
        # Get the ticket
        ticket = BookingTicket.query.get_or_404(ticket_id)
        
        # Get the booking to check ownership
        booking = ticket.booking
        if not booking:
            return jsonify({'error': 'Ticket not found'}), 404
        
        # Check if user has access to this booking
        if booking.owner_id != current_user.id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get the seat assignment
        seat_assignment = SeatAssignment.query.filter_by(ticket_id=ticket_id).first()
        if not seat_assignment:
            return jsonify({'error': 'Seat assignment not found'}), 404
        
        # Update travel status
        seat_assignment.travel_status = 'TRAVELLED'
        seat_assignment.travelled_at = datetime.utcnow()
        seat_assignment.travelled_by_user_id = current_user.id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Ticket for seat {seat_assignment.seat_no} marked as travelled'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error marking ticket as travelled: {str(e)}")
        return jsonify({'error': f'Failed to mark ticket as travelled: {str(e)}'}), 500

@scheduling_bp.route('/api/schedules/<int:schedule_id>/ticket-types', methods=['GET'])
@login_required
def get_schedule_ticket_types(schedule_id):
    """Get ticket types for a specific schedule"""
    try:
        from models.unified_booking import ScheduleTicketType, TicketType
        
        schedule = Schedule.query.get_or_404(schedule_id)
        
        # Get ticket types for this schedule
        schedule_ticket_types = ScheduleTicketType.query.filter_by(
            schedule_id=schedule_id,
            active=True
        ).all()
        
        ticket_types = []
        print(f"DEBUG: Found {len(schedule_ticket_types)} schedule ticket types")
        for stt in schedule_ticket_types:
            # Get ticket type details
            ticket_type = TicketType.query.get(stt.ticket_type_id)
            if ticket_type and ticket_type.active:
                ticket_data = {
                    'id': stt.ticket_type_id,
                    'name': ticket_type.name,
                    'base_price': float(ticket_type.base_price),
                    'currency': ticket_type.currency,
                    'channel': stt.channel,
                    'surcharge': float(stt.surcharge),
                    'discount': float(stt.discount)
                }
                print(f"DEBUG: Ticket type {ticket_type.name} has channel: {stt.channel}")
                ticket_types.append(ticket_data)
        
        return jsonify({
            'success': True,
            'ticket_types': ticket_types
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch ticket types: {str(e)}'}), 500

@scheduling_bp.route('/api/agent-access/<int:owner_id>/<int:agent_id>', methods=['GET'])
@login_required
def check_agent_access(owner_id, agent_id):
    """Check if an agent has access to book on a specific boat"""
    try:
        from models.owner_settings import OwnerAgentConnection
        
        # Check if current user is the agent
        if current_user.id != agent_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Check if agent has approved connection with owner
        connection = OwnerAgentConnection.query.filter_by(
            owner_id=owner_id,
            agent_id=agent_id,
            status='approved'
        ).first()
        
        if connection:
            return jsonify({
                'success': True,
                'hasAccess': True,
                'connection': {
                    'id': connection.id,
                    'currency': connection.currency,
                    'credit_limit': float(connection.credit_limit),
                    'current_balance': float(connection.current_balance)
                }
            })
        else:
            return jsonify({
                'success': True,
                'hasAccess': False,
                'message': 'No approved connection found'
            })
        
    except Exception as e:
        return jsonify({'error': f'Failed to check agent access: {str(e)}'}), 500

@scheduling_bp.route('/api/islands/search', methods=['GET'])
@login_required
def search_islands():
    """Search islands for auto-complete"""
    query = request.args.get('q', '').strip()
    
    if len(query) < 2:
        return jsonify([])
    
    # Search islands by name (case-insensitive)
    islands = Island.query.filter(
        Island.name.ilike(f'%{query}%'),
        Island.is_active == True
    ).order_by(Island.name).limit(10).all()
    
    # Format results as "Atoll.Island"
    results = []
    for island in islands:
        results.append({
            'id': island.id,
            'name': f"{island.atoll}.{island.name}",
            'atoll': island.atoll,
            'island_name': island.name,
            'alt_name': island.alt_name
        })
    
    return jsonify(results)

@scheduling_bp.route('/<int:schedule_id>/delete', methods=['POST'])
@login_required
def delete_schedule(schedule_id):
    """Delete a schedule"""
    schedule = Schedule.query.get_or_404(schedule_id)
    
    if schedule.owner_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    
    try:
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({'message': 'Schedule deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete schedule: {str(e)}'}), 500 