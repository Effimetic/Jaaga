from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.owner_settings import OwnerSettings, PaymentTransaction, StaffUser
from models.user import User
from services.bml_gateway import BMLGatewayService, mvr_to_cents
from models.owner_settings import OwnerAgentConnection
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

@owner_settings_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """Get owner settings"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(
                owner_id=user.id,
                company_name=f"{user.name}'s Boat Service"
            )
            db.session.add(settings)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'settings': {
                'id': settings.id,
                'owner_id': settings.owner_id,
                'company_name': settings.company_name,
                'company_address': settings.company_address,
                'company_phone': settings.company_phone,
                'company_email': settings.company_email,
                'tax_number': settings.tax_number,
                'logo_url': settings.logo_url,
                'created_at': settings.created_at.isoformat() if settings.created_at else None,
                'updated_at': settings.updated_at.isoformat() if settings.updated_at else None
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get settings: {str(e)}'}), 500

@owner_settings_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    """Update owner settings"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        data = request.get_json()
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(owner_id=user.id)
            db.session.add(settings)
        
        # Update fields
        if 'company_name' in data:
            settings.company_name = data['company_name']
        if 'company_address' in data:
            settings.company_address = data['company_address']
        if 'company_phone' in data:
            settings.company_phone = data['company_phone']
        if 'company_email' in data:
            settings.company_email = data['company_email']
        if 'tax_number' in data:
            settings.tax_number = data['tax_number']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Settings updated successfully',
            'settings': {
                'id': settings.id,
                'owner_id': settings.owner_id,
                'company_name': settings.company_name,
                'company_address': settings.company_address,
                'company_phone': settings.company_phone,
                'company_email': settings.company_email,
                'tax_number': settings.tax_number,
                'logo_url': settings.logo_url
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to update settings: {str(e)}'}), 500
@owner_settings_bp.route('/agent-connections', methods=['GET'])
@jwt_required()
def get_agent_connections():
    """Get agent connections for owner"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access agent connections.'}), 403
        
        connections = OwnerAgentConnection.query.filter_by(owner_id=user.id).all()
        
        connections_data = []
        for conn in connections:
            connections_data.append({
                'id': conn.id,
                'agent': {
                    'id': conn.agent.id,
                    'name': conn.agent.name,
                    'phone': conn.agent.phone
                },
                'currency': conn.currency,
                'credit_limit': float(conn.credit_limit),
                'current_balance': float(conn.current_balance),
                'status': conn.status,
                'created_at': conn.created_at.isoformat() if conn.created_at else None
            })
        
        return jsonify({
            'success': True,
            'data': connections_data
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get agent connections: {str(e)}'}), 500

@owner_settings_bp.route('/agent-connections', methods=['POST'])
@jwt_required()
def create_agent_connection():
    """Create new agent connection"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can create agent connections.'}), 403
        
        data = request.get_json()
        agent_phone = data.get('agent_phone', '').strip()
        credit_limit = data.get('credit_limit', 0)
        currency = data.get('currency', 'MVR')
        
        if not agent_phone:
            return jsonify({'error': 'Agent phone number is required'}), 400
        
        # Find agent user
        agent = User.query.filter_by(phone=agent_phone, role='agent').first()
        if not agent:
            return jsonify({'error': 'Agent not found or user is not an agent'}), 404
        
        # Check if connection already exists
        existing = OwnerAgentConnection.query.filter_by(
            owner_id=user.id,
            agent_id=agent.id
        ).first()
        
        if existing:
            return jsonify({'error': 'Connection with this agent already exists'}), 400
        
        # Create connection
        connection = OwnerAgentConnection(
            owner_id=user.id,
            agent_id=agent.id,
            currency=currency,
            credit_limit=credit_limit,
            current_balance=0,
            status='approved'
        )
        
        db.session.add(connection)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Agent connection created successfully',
            'connection': {
                'id': connection.id,
                'agent_name': agent.name,
                'agent_phone': agent.phone,
                'credit_limit': float(connection.credit_limit),
                'status': connection.status
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to create agent connection: {str(e)}'}), 500

# Staff Management Routes
@owner_settings_bp.route('/staff', methods=['GET'])
@jwt_required()
def get_staff():
    """Get staff users"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access staff management.'}), 403
        
        staff_users = StaffUser.query.filter_by(owner_id=user.id).all()
        
        return jsonify({
            'success': True,
            'staff_users': [
                {
                    'id': staff.id,
                    'owner_id': staff.owner_id,
                    'phone_number': staff.phone_number,
                    'name': staff.name,
                    'role': staff.role,
                    'permissions': staff.permissions,
                    'is_active': staff.is_active,
                    'created_at': staff.created_at.isoformat() if staff.created_at else None
                } for staff in staff_users
            ]
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get staff: {str(e)}'}), 500

@owner_settings_bp.route('/staff', methods=['POST'])
@jwt_required()
def add_staff():
    """Add new staff user"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access staff management.'}), 403
        
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
            owner_id=user.id,
            phone_number=phone_number,
            name=name,
            role=role,
            permissions=data.get('permissions', [])
        )
        
        db.session.add(staff_user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Staff user added successfully',
            'staff_user': {
                'id': staff_user.id,
                'owner_id': staff_user.owner_id,
                'phone_number': staff_user.phone_number,
                'name': staff_user.name,
                'role': staff_user.role,
                'permissions': staff_user.permissions,
                'is_active': staff_user.is_active
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to add staff: {str(e)}'}), 500

@owner_settings_bp.route('/settings/staff/<int:staff_id>', methods=['PUT'])
@jwt_required()
def update_staff(staff_id):
    """Update staff user"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access staff management.'}), 403
        
        staff_user = StaffUser.query.filter_by(
            id=staff_id, 
            owner_id=user.id
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
            'success': True,
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
        return jsonify({'error': f'Failed to update staff: {str(e)}'}), 500

@owner_settings_bp.route('/settings/staff/<int:staff_id>', methods=['DELETE'])
@jwt_required()
def delete_staff(staff_id):
    """Delete staff user"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access staff management.'}), 403
        
        staff_user = StaffUser.query.filter_by(
            id=staff_id, 
            owner_id=user.id
        ).first()
        
        if not staff_user:
            return jsonify({'error': 'Staff user not found'}), 404
        
        # Soft delete by setting is_active to False
        staff_user.is_active = False
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Staff user deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': f'Failed to delete staff: {str(e)}'}), 500

@owner_settings_bp.route('/settings/company', methods=['GET'])
@jwt_required()
def get_company_info():
    """Get company information"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(
                owner_id=user.id,
                company_name=f"{user.name}'s Boat Service"
            )
            db.session.add(settings)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'settings': {
                'company_name': settings.company_name,
                'company_description': settings.company_description,
                'company_logo': settings.company_logo
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get company info: {str(e)}'}), 500

@owner_settings_bp.route('/settings/company', methods=['POST'])
@jwt_required()
def update_company_info():
    """Update company information"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        data = request.get_json()
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(owner_id=user.id)
            db.session.add(settings)
        
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
                filename = f"logo_{user.id}_{int(datetime.now().timestamp())}.png"
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                
                os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                with open(filepath, 'wb') as f:
                    f.write(logo_bytes)
                
                settings.company_logo = f"/static/uploads/{filename}"
                
            except Exception as e:
                return jsonify({'error': f'Logo upload failed: {str(e)}'}), 400
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Company information updated successfully',
            'settings': {
                'company_name': settings.company_name,
                'company_description': settings.company_description,
                'company_logo': settings.company_logo
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to update company info: {str(e)}'}), 500

@owner_settings_bp.route('/settings/payment-methods', methods=['GET'])
@jwt_required()
def get_payment_methods():
    """Get payment methods"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(
                owner_id=user.id,
                company_name=f"{user.name}'s Boat Service"
            )
            db.session.add(settings)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'payment_methods': settings.payment_methods,
            'other_methods': settings.other_payment_methods
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get payment methods: {str(e)}'}), 500

@owner_settings_bp.route('/settings/payment-methods', methods=['POST'])
@jwt_required()
def update_payment_methods():
    """Update payment methods"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        data = request.get_json()
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(owner_id=user.id)
            db.session.add(settings)
        
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
            'success': True,
            'message': 'Payment methods updated successfully',
            'payment_methods': settings.payment_methods,
            'other_methods': settings.other_payment_methods
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to update payment methods: {str(e)}'}), 500

@owner_settings_bp.route('/settings/bml-gateway', methods=['GET'])
@jwt_required()
def get_bml_gateway():
    """Get BML Gateway settings"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(
                owner_id=user.id,
                company_name=f"{user.name}'s Boat Service"
            )
            db.session.add(settings)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'bml_configured': settings.is_bml_configured()
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get BML Gateway settings: {str(e)}'}), 500

@owner_settings_bp.route('/settings/bml-gateway', methods=['POST'])
@jwt_required()
def update_bml_gateway():
    """Update BML Gateway settings"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        data = request.get_json()
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(owner_id=user.id)
            db.session.add(settings)
        
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
                        'success': True,
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
            'success': True,
            'message': 'BML Gateway settings updated successfully',
            'bml_configured': settings.is_bml_configured()
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to update BML Gateway settings: {str(e)}'}), 500

@owner_settings_bp.route('/settings/bank-transfer', methods=['GET'])
@jwt_required()
def get_bank_transfer():
    """Get bank transfer settings"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(
                owner_id=user.id,
                company_name=f"{user.name}'s Boat Service"
            )
            db.session.add(settings)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'transfer_configured': settings.is_transfer_configured()
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get bank transfer settings: {str(e)}'}), 500

@owner_settings_bp.route('/settings/bank-transfer', methods=['POST'])
@jwt_required()
def update_bank_transfer():
    """Update bank transfer settings"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        data = request.get_json()
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(owner_id=user.id)
            db.session.add(settings)
        
        # Update bank transfer settings
        settings.bank_account_name = data.get('account_holder', '').strip()
        settings.bank_account_number = data.get('account_number', '').strip()
        settings.bank_name = data.get('bank_name', '').strip()
        settings.transfer_auto_verification = data.get('auto_verification', False)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Bank transfer settings updated successfully',
            'transfer_configured': settings.is_transfer_configured()
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to update bank transfer settings: {str(e)}'}), 500

@owner_settings_bp.route('/settings/ticket-types', methods=['GET'])
@jwt_required()
def get_ticket_types():
    """Get ticket types"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        # Get ticket types from new unified system
        from models.unified_booking import TicketType
        ticket_types = TicketType.query.filter_by(
            owner_id=user.id,
            active=True
        ).order_by(TicketType.name).all()
        
        return jsonify({
            'success': True,
            'ticket_types': [
                {
                    'id': ticket.id,
                    'owner_id': ticket.owner_id,
                    'name': ticket.name,
                    'code': ticket.code,
                    'base_price': float(ticket.base_price),
                    'currency': ticket.currency,
                    'refundable': ticket.refundable,
                    'baggage_rules': ticket.baggage_rules,
                    'active': ticket.active
                } for ticket in ticket_types
            ]
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get ticket types: {str(e)}'}), 500

@owner_settings_bp.route('/settings/ticket-types', methods=['POST'])
@jwt_required()
def update_ticket_types():
    """Create or update ticket types"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        from models.unified_booking import TicketType
        data = request.get_json()
        action = data.get('action')
        
        if action == 'create':
            # Create new ticket type
            ticket_type = TicketType(
                owner_id=user.id,
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
                owner_id=user.id
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
                owner_id=user.id
            ).first()
            
            if not ticket_type:
                return jsonify({'error': 'Ticket type not found'}), 404
            
            ticket_type.active = False
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'Ticket type deleted successfully'})
            
        else:
            return jsonify({'error': 'Invalid action'}), 400
        
    except Exception as e:
        return jsonify({'error': f'Operation failed: {str(e)}'}), 500

@owner_settings_bp.route('/settings/tax-configurations', methods=['GET'])
@jwt_required()
def get_tax_config():
    """Get tax configurations"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        # Get tax profiles from new unified system
        from models.unified_booking import TaxProfile
        tax_profiles = TaxProfile.query.filter_by(
            owner_id=user.id,
            active=True
        ).order_by(TaxProfile.name).all()
        
        return jsonify({
            'success': True,
            'tax_profiles': [
                {
                    'id': tax.id,
                    'owner_id': tax.owner_id,
                    'name': tax.name,
                    'lines': tax.lines,
                    'rounding_rule': tax.rounding_rule,
                    'active': tax.active
                } for tax in tax_profiles
            ]
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get tax configurations: {str(e)}'}), 500

@owner_settings_bp.route('/settings/tax-configurations', methods=['POST'])
@jwt_required()
def update_tax_configurations():
    """Update tax configurations"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
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
                owner_id=user.id,
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
                owner_id=user.id
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
                owner_id=user.id
            ).first()
            
            if not tax_profile:
                return jsonify({'error': 'Tax profile not found'}), 404
            
            tax_profile.active = False
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'Tax profile deleted successfully'})
            
        else:
            return jsonify({'error': 'Invalid action'}), 400
        
    except Exception as e:
        return jsonify({'error': f'Update failed: {str(e)}'}), 500

@owner_settings_bp.route('/api/tax-profiles/<int:profile_id>', methods=['GET'])
@jwt_required()
def get_tax_profile(profile_id):
    """Get a single tax profile"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        from models.unified_booking import TaxProfile
        tax_profile = TaxProfile.query.filter_by(
            id=profile_id,
            owner_id=user.id,
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
@jwt_required()
def calculate_tax_preview():
    """Calculate tax preview for a given amount"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(owner_id=user.id)
            db.session.add(settings)
            db.session.commit()
        
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
            'success': True,
            'subtotal': subtotal,
            'total_tax': total_tax,
            'total_amount': total_amount,
            'tax_breakdown': tax_breakdown,
            'calculation_type': calculation_type
        })
        
    except Exception as e:
        return jsonify({'error': f'Calculation failed: {str(e)}'}), 500

@owner_settings_bp.route('/settings/verify-transfer', methods=['POST'])
@jwt_required()
def verify_transfer():
    """Verify bank transfer using OCR"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
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
        # verification_service = TransferVerificationService() # Temporarily commented out due to OpenCV dependency
        # is_valid, verification_result = verification_service.verify_transfer( # Temporarily commented out due to OpenCV dependency
        #     image_bytes, # Temporarily commented out due to OpenCV dependency
        #     expected_amount, # Temporarily commented out due to OpenCV dependency
        #     expected_currency # Temporarily commented out due to OpenCV dependency
        # ) # Temporarily commented out due to OpenCV dependency
        
        # return jsonify({ # Temporarily commented out due to OpenCV dependency
        #     'is_valid': is_valid, # Temporarily commented out due to OpenCV dependency
        #     'verification_result': verification_result # Temporarily commented out due to OpenCV dependency
        # }) # Temporarily commented out due to OpenCV dependency

        # Placeholder for verification logic if TransferVerificationService is not available
        # This part would typically involve OCR processing and API calls to a verification service
        # For now, we'll return a placeholder response
        return jsonify({
            'is_valid': False,
            'message': 'Transfer verification is currently unavailable due to missing dependencies.'
        })
        
    except Exception as e:
        return jsonify({'error': f'Verification failed: {str(e)}'}), 500

@owner_settings_bp.route('/api/users/by-phone', methods=['GET'])
@jwt_required()
def get_user_by_phone():
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'id': user.id, 'name': user.name, 'role': user.role})
        
    except Exception as e:
        return jsonify({'error': f'Failed to get user by phone: {str(e)}'}), 500


@owner_settings_bp.route('/api/users/create', methods=['POST'])
@jwt_required()
def create_user():
    """Create a new user when phone lookup fails"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
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
        
        return jsonify({
            'id': new_user.id,
            'name': new_user.name,
            'role': new_user.role,
            'message': 'User created successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create user: {str(e)}'}), 500


@owner_settings_bp.route('/settings/test-bml', methods=['POST'])
@jwt_required()
def test_bml_gateway():
    """Test BML Gateway connection"""
    try:
        phone = get_jwt_identity()
        user = User.query.filter_by(phone=phone).first()
        
        if not user or user.role != 'owner':
            return jsonify({'error': 'Access denied. Only boat owners can access settings.'}), 403
        
        # Get or create settings
        settings = OwnerSettings.query.filter_by(owner_id=user.id).first()
        if not settings:
            settings = OwnerSettings(owner_id=user.id)
            db.session.add(settings)
            db.session.commit()
        
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
                'success': True,
                'message': 'BML Gateway test successful',
                'transaction': response
            })
        else:
            return jsonify({
                'error': f'BML Gateway test failed: {response.get("error", "Unknown error")}'
            }), 400
        
    except Exception as e:
        return jsonify({'error': f'Test failed: {str(e)}'}), 500 