import logging
from datetime import datetime
from typing import Dict, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SMSService:
    """SMS Service for handling SMS operations"""
    
    def __init__(self):
        self.provider = "console"  # For now, just print to console
        logger.info("SMS Service initialized - using console output")
    
    def send_verification_code(self, phone: str, code: str) -> Dict[str, any]:
        """
        Send verification code via SMS
        
        Args:
            phone (str): Phone number to send SMS to
            code (str): Verification code to send
            
        Returns:
            Dict containing success status and message
        """
        try:
            # For now, just print to console
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            print("\n" + "="*60)
            print("📱 SMS SENT TO CONSOLE")
            print("="*60)
            print(f"📞 Phone: {phone}")
            print(f"🔐 Code: {code}")
            print(f"⏰ Time: {timestamp}")
            print(f"📤 Provider: {self.provider}")
            print("="*60 + "\n")
            
            # Log to file as well
            logger.info(f"SMS sent to {phone}: Code {code}")
            
            return {
                'success': True,
                'message': 'SMS sent successfully',
                'phone': phone,
                'code': code,
                'timestamp': timestamp,
                'provider': self.provider
            }
            
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone}: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send SMS: {str(e)}',
                'phone': phone,
                'error': str(e)
            }
    
    def send_booking_confirmation(self, phone: str, booking_code: str, schedule_name: str, date: str) -> Dict[str, any]:
        """
        Send booking confirmation SMS
        
        Args:
            phone (str): Phone number
            booking_code (str): Booking reference code
            schedule_name (str): Name of the schedule
            date (str): Schedule date
            
        Returns:
            Dict containing success status and message
        """
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            print("\n" + "="*60)
            print("📱 BOOKING CONFIRMATION SMS")
            print("="*60)
            print(f"📞 Phone: {phone}")
            print(f"🎫 Booking Code: {booking_code}")
            print(f"🚢 Schedule: {schedule_name}")
            print(f"📅 Date: {date}")
            print(f"⏰ Time: {timestamp}")
            print(f"📤 Provider: {self.provider}")
            print("="*60 + "\n")
            
            logger.info(f"Booking confirmation SMS sent to {phone}: {booking_code}")
            
            return {
                'success': True,
                'message': 'Booking confirmation SMS sent',
                'phone': phone,
                'booking_code': booking_code,
                'timestamp': timestamp
            }
            
        except Exception as e:
            logger.error(f"Failed to send booking confirmation SMS to {phone}: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send booking confirmation SMS: {str(e)}',
                'phone': phone,
                'error': str(e)
            }
    
    def send_ticket_delivery(self, phone: str, ticket_url: str, schedule_name: str) -> Dict[str, any]:
        """
        Send ticket delivery SMS
        
        Args:
            phone (str): Phone number
            ticket_url (str): URL to view ticket
            schedule_name (str): Name of the schedule
            
        Returns:
            Dict containing success status and message
        """
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            print("\n" + "="*60)
            print("📱 TICKET DELIVERY SMS")
            print("="*60)
            print(f"📞 Phone: {phone}")
            print(f"🎫 Ticket URL: {ticket_url}")
            print(f"🚢 Schedule: {schedule_name}")
            print(f"⏰ Time: {timestamp}")
            print(f"📤 Provider: {self.provider}")
            print("="*60 + "\n")
            
            logger.info(f"Ticket delivery SMS sent to {phone}: {schedule_name}")
            
            return {
                'success': True,
                'message': 'Ticket delivery SMS sent',
                'phone': phone,
                'ticket_url': ticket_url,
                'timestamp': timestamp
            }
            
        except Exception as e:
            logger.error(f"Failed to send ticket delivery SMS to {phone}: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send ticket delivery SMS: {str(e)}',
                'error': str(e)
            }
    
    def send_payment_reminder(self, phone: str, booking_code: str, amount: str, due_date: str) -> Dict[str, any]:
        """
        Send payment reminder SMS
        
        Args:
            phone (str): Phone number
            booking_code (str): Booking reference code
            amount (str): Amount due
            due_date (str): Payment due date
            
        Returns:
            Dict containing success status and message
        """
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            print("\n" + "="*60)
            print("📱 PAYMENT REMINDER SMS")
            print("="*60)
            print(f"📞 Phone: {phone}")
            print(f"🎫 Booking Code: {booking_code}")
            print(f"💰 Amount Due: {amount}")
            print(f"📅 Due Date: {due_date}")
            print(f"⏰ Time: {timestamp}")
            print(f"📤 Provider: {self.provider}")
            print("="*60 + "\n")
            
            logger.info(f"Payment reminder SMS sent to {phone}: {booking_code}")
            
            return {
                'success': True,
                'message': 'Payment reminder SMS sent',
                'phone': phone,
                'booking_code': booking_code,
                'amount': amount,
                'timestamp': timestamp
            }
            
        except Exception as e:
            logger.error(f"Failed to send payment reminder SMS to {phone}: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send payment reminder SMS: {str(e)}',
                'error': str(e)
            }

# Global instance
sms_service = SMSService()
