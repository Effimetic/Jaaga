from flask import Blueprint, render_template, request, jsonify, redirect, url_for, flash
from flask_login import login_required, current_user
from datetime import datetime
from models.boat_management import Boat, Seat
from models import db
import json

boat_bp = Blueprint('boat_management', __name__)

@boat_bp.route('/boats', methods=['GET'])
@jwt_required()
def boats():
    """Get boats for the current user"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can manage boats.'}), 403
        
        user_boats = Boat.query.filter_by(owner_id=user.id).all()
        
        boats_data = []
        for boat in user_boats:
            boats_data.append({
                'id': boat.id,
                'name': boat.name,
                'seating_type': boat.seating_type,
                'total_seats': boat.total_seats,
                'is_active': boat.is_active,
                'created_at': boat.created_at.isoformat() if boat.created_at else None,
                'updated_at': boat.updated_at.isoformat() if boat.updated_at else None
            })
        
        return jsonify({
            'success': True,
            'data': boats_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get boats: {str(e)}'}), 500

@boat_bp.route('/boats/<int:boat_id>', methods=['GET'])
@jwt_required()
def get_boat(boat_id):
    """Get a specific boat by ID"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access boats.'}), 403
        
        boat = Boat.query.filter_by(id=boat_id, owner_id=user.id).first()
        if not boat:
            return jsonify({'error': 'Boat not found'}), 404
        
        boat_data = {
            'id': boat.id,
            'name': boat.name,
            'seating_type': boat.seating_type,
            'total_seats': boat.total_seats,
            'seating_chart': boat.seating_chart,
            'is_active': boat.is_active,
            'created_at': boat.created_at.isoformat() if boat.created_at else None,
            'updated_at': boat.updated_at.isoformat() if boat.updated_at else None
        }
        
        return jsonify({
            'success': True,
            'data': boat_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get boat: {str(e)}'}), 500

@boat_bp.route('/boats/add', methods=['POST'])
@jwt_required()
def add_boat():
    """Add a new boat"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can add boats.'}), 403
        
        data = request.get_json()
        name = data.get('name', '').strip()
        seating_type = data.get('seating_type', 'total')
        total_seats = data.get('total_seats')
        seating_chart = data.get('seating_chart')
        
        if not name or not total_seats:
            return jsonify({'error': 'Boat name and total seats are required'}), 400
        
        try:
            boat = Boat(
                name=name,
                owner_id=user.id,
                seating_type=seating_type,
                total_seats=total_seats,
                seating_chart=seating_chart
            )
            db.session.add(boat)
            db.session.commit()
            
            # Create seats based on seating type
            if seating_type == 'chart' and seating_chart:
                # Parse seating chart and create individual seats
                chart_data = json.loads(seating_chart)
                
                # Handle new grid-based format
                if 'seatChartData' in chart_data:
                    # New grid-based format
                    seat_chart_data = chart_data['seatChartData']
                    for row in seat_chart_data:
                        for seat in row:
                            if seat.get('number') and not seat.get('isWalkway', False):
                                seat_obj = Seat(
                                    boat_id=boat.id,
                                    seat_number=seat['number']
                                )
                                db.session.add(seat_obj)
                else:
                    # Legacy format
                    for row in chart_data:
                        for seat in row:
                            if seat.get('number'):
                                seat_obj = Seat(
                                    boat_id=boat.id,
                                    seat_number=seat['number']
                                )
                                db.session.add(seat_obj)
            else:
                # Create numbered seats (1, 2, 3, etc.)
                for i in range(1, total_seats + 1):
                    seat = Seat(
                        boat_id=boat.id,
                        seat_number=str(i)
                    )
                    db.session.add(seat)
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Boat added successfully',
                'boat': {
                    'id': boat.id,
                    'name': boat.name,
                    'total_seats': boat.total_seats
                }
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to add boat: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

@boat_bp.route('/boats/<int:boat_id>/edit', methods=['POST'])
@jwt_required()
def edit_boat(boat_id):
    """Edit an existing boat"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can edit boats.'}), 403
        
        boat = Boat.query.filter_by(id=boat_id, owner_id=user.id).first()
        if not boat:
            return jsonify({'error': 'Boat not found'}), 404
        
        data = request.get_json()
        name = data.get('name', '').strip()
        seating_type = data.get('seating_type')
        total_seats = data.get('total_seats')
        seating_chart = data.get('seating_chart')
        
        if not name or not total_seats:
            return jsonify({'error': 'Boat name and total seats are required'}), 400
        
        try:
            boat.name = name
            boat.seating_type = seating_type
            boat.total_seats = total_seats
            boat.seating_chart = seating_chart
            boat.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Boat updated successfully',
                'boat': {
                    'id': boat.id,
                    'name': boat.name,
                    'total_seats': boat.total_seats
                }
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to update boat: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

@boat_bp.route('/boats/<int:boat_id>/delete', methods=['POST'])
@jwt_required()
def delete_boat(boat_id):
    """Delete a boat"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can delete boats.'}), 403
        
        boat = Boat.query.filter_by(id=boat_id, owner_id=user.id).first()
        if not boat:
            return jsonify({'error': 'Boat not found'}), 404
        
        try:
            # Check if boat has active schedules
            active_schedules = Schedule.query.filter_by(
                boat_id=boat.id,
                status='PUBLISHED'
            ).filter(Schedule.schedule_date >= date.today()).count()
            
            if active_schedules > 0:
                return jsonify({'error': 'Cannot delete boat with active schedules'}), 400
            
            # Delete associated seats first
            Seat.query.filter_by(boat_id=boat.id).delete()
            db.session.delete(boat)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Boat deleted successfully'
            })
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to delete boat: {str(e)}'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Failed to process request: {str(e)}'}), 500

# Legacy routes for backward compatibility
@boat_bp.route('/boats')
@jwt_required()
def boats_legacy():
    """Legacy route - redirect to API endpoint"""
    return boats()

@boat_bp.route('/boats/add', methods=['GET', 'POST'])
@jwt_required()
def add_boat_legacy():
    """Legacy route - handle both GET and POST"""
    if request.method == 'POST':
        return add_boat()
    else:
        # For GET requests, return boat form data or redirect
        return jsonify({'message': 'Use POST method to add boat'})

@boat_bp.route('/boats/<int:boat_id>')
@jwt_required()
def view_boat(boat_id):
    """Legacy route - get boat details"""
    return get_boat(boat_id)

@boat_bp.route('/boats/<int:boat_id>/edit', methods=['GET', 'POST'])
@jwt_required()
def edit_boat_legacy(boat_id):
    """Legacy route - handle both GET and POST"""
    if request.method == 'POST':
        return edit_boat(boat_id)
    else:
        # For GET requests, return boat data
        return get_boat(boat_id)

@boat_bp.route('/boats/<int:boat_id>/delete', methods=['POST'])
@jwt_required()
def delete_boat_legacy(boat_id):
    """Legacy route - delete boat"""
    return delete_boat(boat_id)
    
    user_boats = Boat.query.filter_by(owner_id=current_user.id).all()
    return render_template('boats.html', boats=user_boats)

@boat_bp.route('/boats/add', methods=['GET', 'POST'])
@login_required
def add_boat():
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied. Only boat owners can add boats.'}), 403
    
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        seating_type = data.get('seating_type', 'total')
        total_seats = data.get('total_seats')
        seating_chart = data.get('seating_chart')
        
        if not name or not total_seats:
            return jsonify({'error': 'Boat name and total seats are required'}), 400
        
        try:
            boat = Boat(
                name=name,
                owner_id=current_user.id,
                seating_type=seating_type,
                total_seats=total_seats,
                seating_chart=seating_chart
            )
            db.session.add(boat)
            db.session.commit()
            
            # Create seats based on seating type
            if seating_type == 'chart' and seating_chart:
                # Parse seating chart and create individual seats
                chart_data = json.loads(seating_chart)
                
                # Handle new grid-based format
                if 'seatChartData' in chart_data:
                    # New grid-based format
                    seat_chart_data = chart_data['seatChartData']
                    for row in seat_chart_data:
                        for seat in row:
                            if seat.get('number') and not seat.get('isWalkway', False):
                                seat_obj = Seat(
                                    boat_id=boat.id,
                                    seat_number=seat['number']
                                )
                                db.session.add(seat_obj)
                else:
                    # Legacy format
                    for row in chart_data:
                        for seat in row:
                            if seat.get('number'):
                                seat_obj = Seat(
                                    boat_id=boat.id,
                                    seat_number=seat['number']
                                )
                                db.session.add(seat_obj)
            else:
                # Create numbered seats (1, 2, 3, etc.)
                for i in range(1, total_seats + 1):
                    seat = Seat(
                        boat_id=boat.id,
                        seat_number=str(i)
                    )
                    db.session.add(seat)
            
            db.session.commit()
            return jsonify({'message': 'Boat added successfully', 'redirect': url_for('boat_management.boats')})
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to add boat: {str(e)}'}), 500
    
    return render_template('add_boat.html')

@boat_bp.route('/boats/<int:boat_id>')
@login_required
def view_boat(boat_id):
    boat = Boat.query.get_or_404(boat_id)
    if boat.owner_id != current_user.id:
        flash('Access denied.', 'error')
        return redirect(url_for('boat_management.boats'))
    
    return render_template('view_boat.html', boat=boat)

@boat_bp.route('/boats/<int:boat_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_boat(boat_id):
    boat = Boat.query.get_or_404(boat_id)
    if boat.owner_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        seating_type = data.get('seating_type')
        total_seats = data.get('total_seats')
        seating_chart = data.get('seating_chart')
        
        if not name or not total_seats:
            return jsonify({'error': 'Boat name and total seats are required'}), 400
        
        try:
            boat.name = name
            boat.seating_type = seating_type
            boat.total_seats = total_seats
            boat.seating_chart = seating_chart
            boat.updated_at = datetime.utcnow()
            
            db.session.commit()
            return jsonify({'message': 'Boat updated successfully', 'redirect': url_for('boat_management.boats')})
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Failed to update boat: {str(e)}'}), 500
    
    return render_template('edit_boat.html', boat=boat)

@boat_bp.route('/boats/<int:boat_id>/delete', methods=['POST'])
@login_required
def delete_boat(boat_id):
    boat = Boat.query.get_or_404(boat_id)
    if boat.owner_id != current_user.id:
        return jsonify({'error': 'Access denied.'}), 403
    
    try:
        # Delete associated seats first
        Seat.query.filter_by(boat_id=boat.id).delete()
        db.session.delete(boat)
        db.session.commit()
        return jsonify({'message': 'Boat deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete boat: {str(e)}'}), 500 