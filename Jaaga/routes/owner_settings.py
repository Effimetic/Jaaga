from flask import Blueprint, render_template, request, jsonify, flash, redirect, url_for
from flask_login import login_required, current_user
from models import db
from models.owner_settings import OwnerSettings, PaymentTransaction, StaffUser
from models.user import User
from services.bml_gateway import BMLGatewayService, mvr_to_cents
from services.transfer_verification import TransferVerificationService
import os
import base64
from datetime import datetime
from werkzeug.utils import secure_filename

owner_settings_bp = Blueprint('owner_settings', __name__)

# Configure upload settings
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@owner_settings_bp.route('/settings')
@login_required
def settings():
    """Owner settings page"""
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can access settings.', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Get or create settings
    settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
    if not settings:
        settings = OwnerSettings(
            owner_id=current_user.id,
            company_name=f"{current_user.name}'s Boat Service"
        )
        db.session.add(settings)
        db.session.commit()
    
    # Get staff users
    staff_users = StaffUser.query.filter_by(owner_id=current_user.id, is_active=True).all()
    
    return render_template('owner_settings/settings.html', settings=settings, staff_users=staff_users)

# Staff Management Routes
@owner_settings_bp.route('/settings/staff', methods=['GET'])
@login_required
def staff_management():
    """Staff management page"""
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can access staff management.', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Get or create settings
    settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
    if not settings:
        settings = OwnerSettings(
            owner_id=current_user.id,
            company_name=f"{current_user.name}'s Boat Service"
        )
        db.session.add(settings)
        db.session.commit()
    
    staff_users = StaffUser.query.filter_by(owner_id=current_user.id).all()
    return render_template('owner_settings/staff_management.html', staff_users=staff_users, settings=settings)

@owner_settings_bp.route('/settings/staff', methods=['POST'])
@login_required
def add_staff():
    """Add new staff user"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        data = request.get_json()
        
        # Validate required fields
        phone_number = data.get('phone_number', '').strip()
        name = data.get('name', '').strip()
        role = data.get('role', '').strip()
        
        if not all([phone_number, name, role]):
            return jsonify({'error': 'Phone number, name, and role are required'}), 400
        
        # Check if phone number already exists
        existing_staff = StaffUser.query.filter_by(phone_number=phone_number).first()
        if existing_staff:
            return jsonify({'error': 'Phone number already registered'}), 400
        
        # Create new staff user
        staff_user = StaffUser(
            owner_id=current_user.id,
            phone_number=phone_number,
            name=name,
            role=role,
            permissions=data.get('permissions', [])
        )
        
        db.session.add(staff_user)
        db.session.commit()
        
        return jsonify({
            'message': 'Staff user added successfully',
            'staff_user': {
                'id': staff_user.id,
                'name': staff_user.name,
                'phone_number': staff_user.phone_number,
                'role': staff_user.role,
                'role_display': staff_user.get_role_display_name()
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add staff user: {str(e)}'}), 500

@owner_settings_bp.route('/settings/staff/<int:staff_id>', methods=['PUT'])
@login_required
def update_staff(staff_id):
    """Update staff user"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        staff_user = StaffUser.query.filter_by(
            id=staff_id, 
            owner_id=current_user.id
        ).first()
        
        if not staff_user:
            return jsonify({'error': 'Staff user not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            staff_user.name = data['name'].strip()
        if 'role' in data:
            staff_user.role = data['role'].strip()
        if 'permissions' in data:
            staff_user.permissions = data['permissions']
        if 'is_active' in data:
            staff_user.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Staff user updated successfully',
            'staff_user': {
                'id': staff_user.id,
                'name': staff_user.name,
                'phone_number': staff_user.phone_number,
                'role': staff_user.role,
                'role_display': staff_user.get_role_display_name(),
                'is_active': staff_user.is_active
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update staff user: {str(e)}'}), 500

@owner_settings_bp.route('/settings/staff/<int:staff_id>', methods=['DELETE'])
@login_required
def delete_staff(staff_id):
    """Delete staff user"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        staff_user = StaffUser.query.filter_by(
            id=staff_id, 
            owner_id=current_user.id
        ).first()
        
        if not staff_user:
            return jsonify({'error': 'Staff user not found'}), 404
        
        # Soft delete by setting is_active to False
        staff_user.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Staff user deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete staff user: {str(e)}'}), 500

@owner_settings_bp.route('/settings/company', methods=['GET'])
@login_required
def company_info():
    """Company information page"""
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can access settings.', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Get or create settings
    settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
    if not settings:
        settings = OwnerSettings(
            owner_id=current_user.id,
            company_name=f"{current_user.name}'s Boat Service"
        )
        db.session.add(settings)
        db.session.commit()
    
    return render_template('owner_settings/company_info.html', settings=settings)

@owner_settings_bp.route('/settings/company', methods=['POST'])
@login_required
def update_company_info():
    """Update company information"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        data = request.get_json()
        
        # Update company information
        settings.company_name = data.get('company_name', '').strip()
        settings.company_description = data.get('company_description', '').strip()
        
        # Handle logo upload
        if 'company_logo' in data and data['company_logo']:
            # Decode base64 image
            try:
                logo_data = data['company_logo'].split(',')[1]
                logo_bytes = base64.b64decode(logo_data)
                
                # Save logo file
                filename = f"logo_{current_user.id}_{int(datetime.now().timestamp())}.png"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                
                os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                with open(filepath, 'wb') as f:
                    f.write(logo_bytes)
                
                settings.company_logo = f"/static/uploads/{filename}"
                
            except Exception as e:
                return jsonify({'error': f'Logo upload failed: {str(e)}'}), 400
        
        db.session.commit()
        
        return jsonify({
            'message': 'Company information updated successfully',
            'settings': {
                'company_name': settings.company_name,
                'company_description': settings.company_description,
                'company_logo': settings.company_logo
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@owner_settings_bp.route('/settings/payment-methods', methods=['GET'])
@login_required
def payment_methods():
    """Payment methods page"""
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can access settings.', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Get or create settings
    settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
    if not settings:
        settings = OwnerSettings(
            owner_id=current_user.id,
            company_name=f"{current_user.name}'s Boat Service"
        )
        db.session.add(settings)
        db.session.commit()
    
    return render_template('owner_settings/payment_methods.html', settings=settings)

@owner_settings_bp.route('/settings/payment-methods', methods=['POST'])
@login_required
def update_payment_methods():
    """Update payment methods"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        data = request.get_json()
        
        # Update payment methods
        settings.payment_methods = {
            'cash': data.get('cash', False),
            'transfer': data.get('transfer', False),
            'bml_gateway': data.get('bml_gateway', False),
            'other': data.get('other', False)
        }
        
        # Update other payment methods
        settings.other_payment_methods = data.get('other_payment_methods', [])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Payment methods updated successfully',
            'payment_methods': settings.payment_methods,
            'other_methods': settings.other_payment_methods
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@owner_settings_bp.route('/settings/bml-gateway', methods=['GET'])
@login_required
def bml_gateway():
    """BML Gateway page"""
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can access settings.', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Get or create settings
    settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
    if not settings:
        settings = OwnerSettings(
            owner_id=current_user.id,
            company_name=f"{current_user.name}'s Boat Service"
        )
        db.session.add(settings)
        db.session.commit()
    
    return render_template('owner_settings/bml_gateway.html', settings=settings)

@owner_settings_bp.route('/settings/bml-gateway', methods=['POST'])
@login_required
def update_bml_gateway():
    """Update BML Gateway settings"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        data = request.get_json()
        
        # Update BML Gateway settings
        settings.bml_merchant_id = data.get('merchant_id', '').strip()
        settings.bml_api_key = data.get('api_key', '').strip()
        settings.bml_client_id = data.get('client_id', '').strip()
        settings.bml_client_secret = data.get('client_secret', '').strip()
        settings.bml_environment = data.get('environment', 'testing')
        
        # Test BML Gateway connection if enabled
        if data.get('test_connection', False):
            if settings.is_bml_configured():
                bml_service = BMLGatewayService(
                    settings.bml_api_key,
                    settings.bml_client_id,
                    settings.bml_client_secret,
                    settings.bml_environment
                )
                
                # Test with a small amount
                success, response = bml_service.create_transaction(
                    amount=100,  # 1 MVR
                    currency='MVR',
                    local_id='test_connection',
                    customer_reference='BML Gateway Test'
                )
                
                if success:
                    return jsonify({
                        'message': 'BML Gateway configured and tested successfully',
                        'test_result': response
                    })
                else:
                    return jsonify({
                        'error': f'BML Gateway test failed: {response.get("error", "Unknown error")}'
                    }), 400
            else:
                return jsonify({'error': 'BML Gateway not properly configured'}), 400
        
        db.session.commit()
        
        return jsonify({
            'message': 'BML Gateway settings updated successfully',
            'bml_configured': settings.is_bml_configured()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@owner_settings_bp.route('/settings/bank-transfer', methods=['GET'])
@login_required
def bank_transfer():
    """Bank transfer page"""
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can access settings.', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Get or create settings
    settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
    if not settings:
        settings = OwnerSettings(
            owner_id=current_user.id,
            company_name=f"{current_user.name}'s Boat Service"
        )
        db.session.add(settings)
        db.session.commit()
    
    return render_template('owner_settings/bank_transfer.html', settings=settings)

@owner_settings_bp.route('/settings/bank-transfer', methods=['POST'])
@login_required
def update_bank_transfer():
    """Update bank transfer settings"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        data = request.get_json()
        
        # Update bank transfer settings
        settings.bank_account_name = data.get('account_holder', '').strip()
        settings.bank_account_number = data.get('account_number', '').strip()
        settings.bank_name = data.get('bank_name', '').strip()
        settings.transfer_auto_verification = data.get('auto_verification', False)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Bank transfer settings updated successfully',
            'transfer_configured': settings.is_transfer_configured()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@owner_settings_bp.route('/settings/ticket-types', methods=['GET'])
@login_required
def ticket_types():
    """Ticket types page"""
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can access settings.', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Get ticket types from new unified system
    from models.unified_booking import TicketType
    ticket_types = TicketType.query.filter_by(
        owner_id=current_user.id,
        active=True
    ).order_by(TicketType.name).all()
    
    return render_template('owner_settings/ticket_types.html', ticket_types=ticket_types)

@owner_settings_bp.route('/settings/ticket-types', methods=['POST'])
@login_required
def update_ticket_types():
    """Create or update ticket types"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        from models.unified_booking import TicketType
        data = request.get_json()
        action = data.get('action')
        
        if action == 'create':
            # Create new ticket type
            ticket_type = TicketType(
                owner_id=current_user.id,
                name=data['name'],
                code=data['code'],
                base_price=data['base_price'],
                currency=data.get('currency', 'MVR'),
                refundable=data.get('refundable', True),
                baggage_rules=data.get('baggage_rules', {}),
                active=True
            )
            db.session.add(ticket_type)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Ticket type created successfully',
                'ticket_type': {
                    'id': ticket_type.id,
                    'name': ticket_type.name,
                    'code': ticket_type.code,
                    'base_price': float(ticket_type.base_price),
                    'currency': ticket_type.currency,
                    'refundable': ticket_type.refundable
                }
            })
            
        elif action == 'update':
            # Update existing ticket type
            ticket_type = TicketType.query.filter_by(
                id=data['id'],
                owner_id=current_user.id
            ).first()
            
            if not ticket_type:
                return jsonify({'error': 'Ticket type not found'}), 404
            
            ticket_type.name = data['name']
            ticket_type.code = data['code']
            ticket_type.base_price = data['base_price']
            ticket_type.currency = data.get('currency', 'MVR')
            ticket_type.refundable = data.get('refundable', True)
            ticket_type.baggage_rules = data.get('baggage_rules', {})
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Ticket type updated successfully',
                'ticket_type': {
                    'id': ticket_type.id,
                    'name': ticket_type.name,
                    'code': ticket_type.code,
                    'base_price': float(ticket_type.base_price),
                    'currency': ticket_type.currency,
                    'refundable': ticket_type.refundable
                }
            })
            
        elif action == 'delete':
            # Soft delete ticket type
            ticket_type = TicketType.query.filter_by(
                id=data['id'],
                owner_id=current_user.id
            ).first()
            
            if not ticket_type:
                return jsonify({'error': 'Ticket type not found'}), 404
            
            ticket_type.active = False
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'Ticket type deleted successfully'})
            
        else:
            return jsonify({'error': 'Invalid action'}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Operation failed: {str(e)}'}), 500

@owner_settings_bp.route('/settings/tax-configurations', methods=['GET'])
@login_required
def tax_config():
    """Tax configuration page"""
    if current_user.role != 'owner':
        flash('Access denied. Only boat owners can access settings.', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Get tax profiles from new unified system
    from models.unified_booking import TaxProfile
    tax_profiles = TaxProfile.query.filter_by(
        owner_id=current_user.id,
        active=True
    ).order_by(TaxProfile.name).all()
    
    return render_template('owner_settings/tax_config.html', tax_profiles=tax_profiles)

@owner_settings_bp.route('/settings/tax-configurations', methods=['POST'])
@login_required
def update_tax_configurations():
    """Update tax configurations"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        data = request.get_json()
        
        # Validate tax profile data
        if not data.get('name', '').strip():
            return jsonify({'error': 'Tax profile name is required'}), 400
        
        lines = data.get('lines', [])
        for line in lines:
            if not line.get('name', '').strip():
                return jsonify({'error': 'Tax line name is required'}), 400
            
            try:
                value = float(line.get('value', 0))
                if value < 0:
                    return jsonify({'error': 'Tax value cannot be negative'}), 400
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid tax value'}), 400
        
        # Create or update tax profile
        from models.unified_booking import TaxProfile
        action = data.get('action')
        
        if action == 'create':
            tax_profile = TaxProfile(
                owner_id=current_user.id,
                name=data['name'],
                lines=lines,
                rounding_rule=data.get('rounding_rule', 'ROUND_NEAREST'),
                active=True
            )
            db.session.add(tax_profile)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Tax profile created successfully',
                'tax_profile': {
                    'id': tax_profile.id,
                    'name': tax_profile.name,
                    'lines': tax_profile.lines,
                    'rounding_rule': tax_profile.rounding_rule
                }
            })
            
        elif action == 'update':
            tax_profile = TaxProfile.query.filter_by(
                id=data['id'],
                owner_id=current_user.id
            ).first()
            
            if not tax_profile:
                return jsonify({'error': 'Tax profile not found'}), 404
            
            tax_profile.name = data['name']
            tax_profile.lines = lines
            tax_profile.rounding_rule = data.get('rounding_rule', 'ROUND_NEAREST')
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Tax profile updated successfully',
                'tax_profile': {
                    'id': tax_profile.id,
                    'name': tax_profile.name,
                    'lines': tax_profile.lines,
                    'rounding_rule': tax_profile.rounding_rule
                }
            })
            
        elif action == 'delete':
            tax_profile = TaxProfile.query.filter_by(
                id=data['id'],
                owner_id=current_user.id
            ).first()
            
            if not tax_profile:
                return jsonify({'error': 'Tax profile not found'}), 404
            
            tax_profile.active = False
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'Tax profile deleted successfully'})
            
        else:
            return jsonify({'error': 'Invalid action'}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@owner_settings_bp.route('/api/tax-profiles/<int:profile_id>', methods=['GET'])
@login_required
def get_tax_profile(profile_id):
    """Get a single tax profile"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        from models.unified_booking import TaxProfile
        tax_profile = TaxProfile.query.filter_by(
            id=profile_id,
            owner_id=current_user.id,
            active=True
        ).first()
        
        if not tax_profile:
            return jsonify({'error': 'Tax profile not found'}), 404
        
        return jsonify({
            'success': True,
            'tax_profile': {
                'id': tax_profile.id,
                'name': tax_profile.name,
                'lines': tax_profile.lines,
                'rounding_rule': tax_profile.rounding_rule
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch tax profile: {str(e)}'}), 500

@owner_settings_bp.route('/settings/calculate-tax', methods=['POST'])
@login_required
def calculate_tax_preview():
    """Calculate tax preview for a given amount"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        data = request.get_json()
        input_amount = float(data.get('subtotal', 0))
        calculation_type = data.get('type', 'subtotal')  # 'subtotal' or 'total'
        
        if input_amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        if calculation_type == 'total':
            # If input is total amount (inclusive taxes), calculate subtotal first
            subtotal = settings.calculate_subtotal_from_total(input_amount)
            total_amount = input_amount
        else:
            # If input is subtotal, calculate total
            subtotal = input_amount
            total_amount = settings.calculate_total_from_subtotal(input_amount)
        
        # Calculate tax breakdown
        tax_breakdown = settings.get_tax_breakdown(subtotal)
        total_tax = total_amount - subtotal
        
        return jsonify({
            'subtotal': subtotal,
            'total_tax': total_tax,
            'total_amount': total_amount,
            'tax_breakdown': tax_breakdown,
            'calculation_type': calculation_type
        })
        
    except Exception as e:
        return jsonify({'error': f'Calculation failed: {str(e)}'}), 500

@owner_settings_bp.route('/settings/verify-transfer', methods=['POST'])
@login_required
def verify_transfer():
    """Verify bank transfer using OCR"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        data = request.get_json()
        screenshot_data = data.get('screenshot')
        expected_amount = float(data.get('amount', 0))
        expected_currency = data.get('currency', 'MVR')
        
        if not screenshot_data:
            return jsonify({'error': 'Screenshot is required'}), 400
        
        # Decode base64 image
        try:
            image_data = screenshot_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
        except Exception:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Verify transfer
        verification_service = TransferVerificationService()
        is_valid, verification_result = verification_service.verify_transfer(
            image_bytes,
            expected_amount,
            expected_currency
        )
        
        return jsonify({
            'is_valid': is_valid,
            'verification_result': verification_result
        })
        
    except Exception as e:
        return jsonify({'error': f'Verification failed: {str(e)}'}), 500

@owner_settings_bp.route('/api/users/by-phone', methods=['GET'])
@login_required
def get_user_by_phone():
    print(f"DEBUG: API called with phone: {request.args.get('phone')}")
    print(f"DEBUG: Current user: {current_user.id if current_user.is_authenticated else 'Not authenticated'}")
    print(f"DEBUG: Current user role: {current_user.role if current_user.is_authenticated else 'N/A'}")
    
    phone = request.args.get('phone', '').strip()
    if not phone:
        return jsonify({'error': 'Phone is required'}), 400
    
    # Try to find user with exact phone match first
    user = User.query.filter_by(phone=phone).first()
    
    # If not found, try with different phone formats
    if not user:
        # Try with +960 prefix
        user = User.query.filter_by(phone=f"+960 {phone}").first()
    
    if not user:
        # Try without +960 prefix (remove +960 if present)
        clean_phone = phone.replace('+960 ', '').replace('+960', '')
        user = User.query.filter_by(phone=clean_phone).first()
    
    if not user:
        print(f"DEBUG: No user found for phone: {phone}")
        # Return option to create new user with +960 prefix
        suggested_phone = f"+960 {phone}" if not phone.startswith('+960') else phone
        return jsonify({
            'error': 'Not found',
            'suggest_create': True,
            'suggested_phone': suggested_phone,
            'message': f'User not found. Would you like to create a new user with phone {suggested_phone}?'
        }), 404
    
    print(f"DEBUG: Found user: {user.name} (ID: {user.id})")
    return jsonify({'id': user.id, 'name': user.name, 'role': user.role})


@owner_settings_bp.route('/api/users/create', methods=['POST'])
@login_required
def create_user():
    """Create a new user when phone lookup fails"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        data = request.get_json()
        phone = data.get('phone', '').strip()
        name = data.get('name', '').strip()
        
        if not phone or not name:
            return jsonify({'error': 'Phone and name are required'}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(phone=phone).first()
        if existing_user:
            return jsonify({'error': 'User with this phone number already exists'}), 400
        
        # Create new user with 'customer' role
        new_user = User(
            name=name,
            phone=phone,
            role='customer',
            is_active=True
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        print(f"DEBUG: Created new user: {name} (ID: {new_user.id}) with phone: {phone}")
        return jsonify({
            'id': new_user.id,
            'name': new_user.name,
            'role': new_user.role,
            'message': 'User created successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"DEBUG: Error creating user: {str(e)}")
        return jsonify({'error': f'Failed to create user: {str(e)}'}), 500


@owner_settings_bp.route('/settings/test-bml', methods=['POST'])
@login_required
def test_bml_gateway():
    """Test BML Gateway connection"""
    if current_user.role != 'owner':
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        settings = OwnerSettings.query.filter_by(owner_id=current_user.id).first()
        if not settings:
            return jsonify({'error': 'Settings not found'}), 404
        
        if not settings.is_bml_configured():
            return jsonify({'error': 'BML Gateway not properly configured'}), 400
        
        # Create test transaction
        bml_service = BMLGatewayService(
            settings.bml_api_key,
            settings.bml_client_id,
            settings.bml_client_secret,
            settings.bml_environment
        )
        
        success, response = bml_service.create_transaction(
            amount=100,  # 1 MVR
            currency='MVR',
            local_id=f'test_{int(datetime.now().timestamp())}',
            customer_reference='BML Gateway Test'
        )
        
        if success:
            return jsonify({
                'message': 'BML Gateway test successful',
                'transaction': response
            })
        else:
            return jsonify({
                'error': f'BML Gateway test failed: {response.get("error", "Unknown error")}'
            }), 400
        
    except Exception as e:
        return jsonify({'error': f'Test failed: {str(e)}'}), 500 