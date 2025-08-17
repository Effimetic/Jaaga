from datetime import datetime
from models import db

class OwnerSettings(db.Model):
    """Boat owner settings and configuration"""
    __tablename__ = 'owner_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    company_name = db.Column(db.String(200), nullable=False)
    company_logo = db.Column(db.String(500), nullable=True)
    company_description = db.Column(db.Text, nullable=True)
    payment_methods = db.Column(db.JSON, default={'cash': True, 'transfer': True, 'bml_gateway': False, 'other': False})
    bml_merchant_id = db.Column(db.String(100), nullable=True)
    bml_api_key = db.Column(db.String(500), nullable=True)
    bml_client_id = db.Column(db.String(100), nullable=True)
    bml_client_secret = db.Column(db.String(500), nullable=True)
    bml_environment = db.Column(db.String(20), default='testing')
    bank_account_name = db.Column(db.String(200), nullable=True)
    bank_account_number = db.Column(db.String(50), nullable=True)
    bank_name = db.Column(db.String(100), nullable=True)
    transfer_auto_verification = db.Column(db.Boolean, default=False)
    # Legacy fields - will be replaced by new unified system
    ticket_types = db.Column(db.JSON, default={'regular': {'name': 'Regular', 'discount': 0}, 'complimentary': {'name': 'Complimentary', 'discount': 100}, 'discounted': {'name': 'Discounted', 'discount': 10}})
    tax_configurations = db.Column(db.JSON, default={
        'enabled': False,
        'taxes': []
    })
    other_payment_methods = db.Column(db.JSON, default=[])
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = db.relationship('User', backref='settings')
    
    def get_payment_methods_list(self):
        """Get list of enabled payment methods"""
        methods = []
        if self.payment_methods.get('cash'):
            methods.append('Cash')
        if self.payment_methods.get('transfer'):
            methods.append('Bank Transfer')
        if self.payment_methods.get('bml_gateway'):
            methods.append('BML Gateway')
        if self.payment_methods.get('other'):
            methods.extend(self.other_payment_methods)
        return methods
    
    def is_bml_configured(self):
        """Check if BML Gateway is properly configured"""
        return all([
            self.bml_merchant_id,
            self.bml_api_key,
            self.bml_client_id,
            self.bml_client_secret
        ])
    
    def is_transfer_configured(self):
        """Check if bank transfer is properly configured"""
        return all([
            self.bank_account_name,
            self.bank_account_number,
            self.bank_name
        ])
    
    def calculate_tax(self, subtotal):
        """Calculate tax amount based on configured taxes"""
        if not self.tax_configurations.get('enabled', False):
            return 0
        
        total_tax = 0
        taxes = self.tax_configurations.get('taxes', [])
        
        for tax in taxes:
            if not tax.get('enabled', False):
                continue
                
            tax_rate = float(tax.get('rate', 0))
            tax_type = tax.get('type', 'percentage')  # 'percentage' or 'flat'
            tax_inclusive = tax.get('inclusive', False)  # True for inclusive, False for exclusive
            
            if tax_type == 'percentage':
                if tax_inclusive:
                    # For inclusive tax, calculate tax from total (given amount includes tax)
                    tax_amount = subtotal * (tax_rate / (100 + tax_rate))
                else:
                    # For exclusive tax, add tax to subtotal
                    tax_amount = subtotal * (tax_rate / 100)
            else:  # flat rate
                if tax_inclusive:
                    # For inclusive flat tax, the tax amount is already included in the total
                    tax_amount = tax_rate
                else:
                    # For exclusive flat tax, add the flat amount
                    tax_amount = tax_rate
            
            total_tax += tax_amount
        
        return round(total_tax, 2)
    
    def calculate_subtotal_from_total(self, total_amount):
        """Calculate subtotal from total amount when taxes are inclusive"""
        if not self.tax_configurations.get('enabled', False):
            return total_amount
        
        # Get all enabled inclusive taxes
        inclusive_taxes = []
        for tax in self.tax_configurations.get('taxes', []):
            if tax.get('enabled', False) and tax.get('inclusive', False):
                inclusive_taxes.append(tax)
        
        if not inclusive_taxes:
            return total_amount
        
        # Calculate subtotal by removing all inclusive taxes
        subtotal = total_amount
        
        # First remove flat inclusive taxes
        for tax in inclusive_taxes:
            if tax.get('type') == 'flat':
                subtotal -= float(tax.get('rate', 0))
        
        # Then remove percentage inclusive taxes
        # For multiple percentage taxes, we need to calculate the effective rate
        percentage_taxes = [tax for tax in inclusive_taxes if tax.get('type') == 'percentage']
        if percentage_taxes:
            # Calculate the effective inclusive rate
            effective_rate = 1.0
            for tax in percentage_taxes:
                rate = float(tax.get('rate', 0)) / 100
                effective_rate += rate
            
            # Remove the inclusive percentage taxes
            subtotal = subtotal / effective_rate
        
        return round(subtotal, 2)
    
    def calculate_total_from_subtotal(self, subtotal):
        """Calculate total amount from subtotal including all taxes"""
        if not self.tax_configurations.get('enabled', False):
            return subtotal
        
        # For inclusive taxes, we need to calculate the total differently
        # The subtotal is the base amount, and inclusive taxes are already "built into" the total
        
        # Get all enabled taxes
        enabled_taxes = []
        for tax in self.tax_configurations.get('taxes', []):
            if tax.get('enabled', False):
                enabled_taxes.append(tax)
        
        if not enabled_taxes:
            return subtotal
        
        # Calculate total by adding exclusive taxes to subtotal
        total = subtotal
        
        for tax in enabled_taxes:
            if not tax.get('inclusive', False):  # Only add exclusive taxes
                tax_rate = float(tax.get('rate', 0))
                tax_type = tax.get('type', 'percentage')
                
                if tax_type == 'percentage':
                    total += subtotal * (tax_rate / 100)
                else:  # flat rate
                    total += tax_rate
        
        # For inclusive taxes, we need to calculate what the total would be
        # if the subtotal were the base amount and inclusive taxes were added
        inclusive_taxes = [tax for tax in enabled_taxes if tax.get('inclusive', False)]
        if inclusive_taxes:
            # Calculate the effective inclusive rate
            effective_rate = 1.0
            for tax in inclusive_taxes:
                if tax.get('type') == 'percentage':
                    rate = float(tax.get('rate', 0)) / 100
                    effective_rate += rate
                else:  # flat rate
                    total += float(tax.get('rate', 0))
            
            # Apply the effective rate to get the total
            total = subtotal * effective_rate
        
        return round(total, 2)
    
    def get_tax_breakdown(self, subtotal):
        """Get detailed tax breakdown"""
        if not self.tax_configurations.get('enabled', False):
            return []
        
        breakdown = []
        taxes = self.tax_configurations.get('taxes', [])
        
        for tax in taxes:
            if not tax.get('enabled', False):
                continue
                
            tax_rate = float(tax.get('rate', 0))
            tax_type = tax.get('type', 'percentage')
            tax_inclusive = tax.get('inclusive', False)
            tax_name = tax.get('name', 'Tax')
            
            if tax_type == 'percentage':
                if tax_inclusive:
                    tax_amount = subtotal * (tax_rate / (100 + tax_rate))
                else:
                    tax_amount = subtotal * (tax_rate / 100)
            else:  # flat rate
                if tax_inclusive:
                    # For inclusive flat tax, the amount is already included
                    tax_amount = tax_rate
                else:
                    # For exclusive flat tax, add the amount
                    tax_amount = tax_rate
            
            breakdown.append({
                'name': tax_name,
                'rate': tax_rate,
                'type': tax_type,
                'inclusive': tax_inclusive,
                'amount': round(tax_amount, 2)
            })
        
        return breakdown

class StaffUser(db.Model):
    """Staff users managed by boat owners"""
    __tablename__ = 'staff_users'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False, unique=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # 'manage_booking', 'do_onboarding', 'admin'
    permissions = db.Column(db.JSON, default=[])
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_id], backref='staff_users')
    
    def get_role_display_name(self):
        """Get human-readable role name"""
        role_names = {
            'manage_booking': 'Manage Bookings',
            'do_onboarding': 'Do Onboarding',
            'admin': 'Administrator'
        }
        return role_names.get(self.role, self.role.title())
    
    def has_permission(self, permission):
        """Check if user has specific permission"""
        return permission in self.permissions


class OwnerAgentConnection(db.Model):
    """Connections between owners and agents with credit/limits"""
    __tablename__ = 'owner_agent_connections'

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    agent_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    currency = db.Column(db.String(3), default='MVR')
    credit_limit = db.Column(db.Numeric(10, 2), default=0)
    current_balance = db.Column(db.Numeric(10, 2), default=0)
    status = db.Column(db.String(20), default='pending')  # pending/approved/rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = db.relationship('User', foreign_keys=[owner_id])
    agent = db.relationship('User', foreign_keys=[agent_id])

class PaymentTransaction(db.Model):
    """Payment transactions for bookings"""
    __tablename__ = 'payment_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, nullable=True)  # Will reference unified booking system
    schedule_id = db.Column(db.Integer, db.ForeignKey('schedule.id'), nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='MVR')
    payment_method = db.Column(db.String(50), nullable=False)
    payment_status = db.Column(db.String(20), default='pending')
    bml_transaction_id = db.Column(db.String(100), nullable=True)
    bml_qr_code_url = db.Column(db.String(500), nullable=True)
    bml_signature = db.Column(db.String(500), nullable=True)
    transfer_reference = db.Column(db.String(100), nullable=True)
    transfer_screenshot = db.Column(db.String(500), nullable=True)
    transfer_verified = db.Column(db.Boolean, default=False)
    transfer_verified_at = db.Column(db.DateTime, nullable=True)
    transfer_verified_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    payment_reference = db.Column(db.String(100), nullable=True)
    payment_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_id], backref='payment_transactions')
    verified_by = db.relationship('User', foreign_keys=[transfer_verified_by])


class AppOwnerSettings(db.Model):
    """App owner settings for commission and system configuration"""
    __tablename__ = 'app_owner_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    commission_rate = db.Column(db.Numeric(10, 2), default=10.00)  # MVR 10 per ticket
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CommissionLedger(db.Model):
    """Commission ledger for tracking all financial transactions"""
    __tablename__ = 'commission_ledger'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('payment_transactions.id'), nullable=False)
    commission_amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='MVR')
    from_owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    to_app_owner = db.Column(db.Boolean, default=True)  # True for app owner, False for boat owner
    entry_type = db.Column(db.String(20), nullable=False)  # 'credit' or 'debit'
    description = db.Column(db.String(200), nullable=False)  # Match actual DB schema
    entry_date = db.Column(db.DateTime, default=datetime.utcnow)  # Match actual DB schema
    running_balance = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Relationships
    transaction = db.relationship('PaymentTransaction', backref='commission_entries')
    from_owner = db.relationship('User', foreign_keys=[from_owner_id]) 