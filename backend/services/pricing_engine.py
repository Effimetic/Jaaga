from decimal import Decimal
from models.unified_booking import TicketType, TaxProfile, ScheduleTicketType
from models.owner_settings import AppOwnerSettings
from models import db

class PricingEngine:
    """Pricing engine for calculating ticket prices with taxes and fees"""
    
    def __init__(self, owner_id, schedule_id):
        self.owner_id = owner_id
        self.schedule_id = schedule_id
        # Get or create app settings
        self.app_settings = AppOwnerSettings.query.filter_by(is_active=True).first()
        if not self.app_settings:
            self.app_settings = AppOwnerSettings(commission_rate=10.00, is_active=True)
            db.session.add(self.app_settings)
            db.session.commit()
        
    def calculate_booking_price(self, ticket_requests, channel='PUBLIC', agent_id=None):
        """
        Calculate total price for a booking
        
        Args:
            ticket_requests: List of dicts with ticket_type_id and quantity
            channel: PUBLIC, AGENT, or OWNER
            agent_id: Agent ID if channel is AGENT
            
        Returns:
            dict with pricing breakdown
        """
        try:
            # Get schedule ticket types
            schedule_ticket_types = ScheduleTicketType.query.filter_by(
                schedule_id=self.schedule_id,
                active=True
            ).all()
            
            if not schedule_ticket_types:
                raise ValueError("No active ticket types found for this schedule")
            
            # Get schedule and tax profile
            schedule = Schedule.query.get(self.schedule_id)
            tax_profile = None
            if schedule and schedule.tax_profile_id:
                tax_profile = TaxProfile.query.get(schedule.tax_profile_id)
            
            # Calculate line items
            line_items = []
            subtotal = Decimal('0')
            
            for request in ticket_requests:
                ticket_type_id = request['ticket_type_id']
                quantity = request['quantity']
                
                # Find schedule ticket type
                schedule_ticket_type = next(
                    (stt for stt in schedule_ticket_types if stt.ticket_type_id == ticket_type_id),
                    None
                )
                
                if not schedule_ticket_type:
                    raise ValueError(f"Ticket type {ticket_type_id} not enabled for this schedule")
                
                # Get base price
                ticket_type = TicketType.query.get(ticket_type_id)
                if not ticket_type:
                    raise ValueError(f"Ticket type {ticket_type_id} not found")
                
                base_price = Decimal(str(ticket_type.base_price))
                
                # Apply schedule modifiers
                final_price = base_price + Decimal(str(schedule_ticket_type.surcharge)) - Decimal(str(schedule_ticket_type.discount))
                
                # Calculate for quantity
                line_total = final_price * quantity
                subtotal += line_total
                
                line_items.append({
                    'ticket_type_id': ticket_type_id,
                    'ticket_type_name': ticket_type.name,
                    'ticket_type_code': ticket_type.code,
                    'base_price': float(base_price),
                    'surcharge': float(schedule_ticket_type.surcharge),
                    'discount': float(schedule_ticket_type.discount),
                    'final_price': float(final_price),
                    'quantity': quantity,
                    'line_total': float(line_total)
                })
            
            # Calculate taxes
            tax_total = Decimal('0')
            if tax_profile:
                tax_total = tax_profile.calculate_tax(subtotal)
            
            # Calculate discounts (schedule-level or channel-specific)
            discount_total = Decimal('0')
            
            # Apply channel-specific rules
            channel_modifiers = self._get_channel_modifiers(channel, agent_id, subtotal)
            discount_total += channel_modifiers.get('discount', Decimal('0'))
            
            # Calculate grand total
            grand_total = subtotal + tax_total - discount_total
            
            # Add app owner fee
            app_fee = Decimal('0')
            if self.app_settings:
                app_fee = Decimal(str(self.app_settings.commission_rate))
            
            # Add app fee to line items
            if app_fee > 0:
                line_items.append({
                    'type': 'app_fee',
                    'description': 'App Platform Fee',
                    'amount': float(app_fee),
                    'quantity': 1,
                    'line_total': float(app_fee)
                })
                grand_total += app_fee
            
            # Add tax line item
            if tax_total > 0:
                line_items.append({
                    'type': 'tax',
                    'description': 'Taxes',
                    'amount': float(tax_total),
                    'quantity': 1,
                    'line_total': float(tax_total)
                })
            
            return {
                'line_items': line_items,
                'subtotal': float(subtotal),
                'tax_total': float(tax_total),
                'discount_total': float(discount_total),
                'app_fee': float(app_fee),
                'grand_total': float(grand_total),
                'currency': 'MVR',
                'channel': channel,
                'agent_id': agent_id
            }
            
        except Exception as e:
            raise ValueError(f"Pricing calculation failed: {str(e)}")
    
    def _get_channel_modifiers(self, channel, agent_id, subtotal):
        """Get channel-specific pricing modifiers"""
        modifiers = {'discount': Decimal('0')}
        
        if channel == 'AGENT' and agent_id:
            # Apply agent commission/discount
            # This would typically come from OwnerAgentConnection
            pass
        elif channel == 'OWNER':
            # Owner bookings might get special pricing
            modifiers['discount'] = subtotal * Decimal('0.1')  # 10% discount for owners
        
        return modifiers
    
    def validate_ticket_types(self, ticket_type_ids):
        """Validate that ticket types are enabled for this schedule"""
        enabled_types = ScheduleTicketType.query.filter_by(
            schedule_id=self.schedule_id,
            active=True
        ).all()
        
        enabled_type_ids = [stt.ticket_type_id for stt in enabled_types]
        
        for ticket_type_id in ticket_type_ids:
            if ticket_type_id not in enabled_type_ids:
                return False
        
        return True
    
    def get_schedule_pricing_summary(self):
        """Get pricing summary for a schedule"""
        schedule_ticket_types = ScheduleTicketType.query.filter_by(
            schedule_id=self.schedule_id,
            active=True
        ).all()
        
        summary = []
        for stt in schedule_ticket_types:
            ticket_type = TicketType.query.get(stt.ticket_type_id)
            if ticket_type:
                base_price = Decimal(str(ticket_type.base_price))
                final_price = base_price + Decimal(str(stt.surcharge)) - Decimal(str(stt.discount))
                
                summary.append({
                    'ticket_type_id': ticket_type.id,
                    'name': ticket_type.name,
                    'code': ticket_type.code,
                    'base_price': float(base_price),
                    'surcharge': float(stt.surcharge),
                    'discount': float(stt.discount),
                    'final_price': float(final_price),
                    'currency': ticket_type.currency,
                    'refundable': ticket_type.refundable
                })
        
        return summary
