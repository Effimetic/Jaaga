import requests
import hashlib
import base64
import json
from datetime import datetime
from typing import Dict, Optional, Tuple

class BMLGatewayService:
    """BML Gateway service for payment processing"""
    
    def __init__(self, api_key: str, client_id: str, client_secret: str, environment: str = 'testing'):
        self.api_key = api_key
        self.client_id = client_id
        self.client_secret = client_secret
        self.environment = environment
        
        # Set base URL based on environment
        if environment == 'production':
            self.base_url = 'https://api.merchants.bankofmaldives.com.mv/public'
        else:
            self.base_url = 'https://api.uat.merchants.bankofmaldives.com.mv/public'
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for API requests"""
        return {
            'Authorization': self.api_key,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    
    def _generate_signature(self, data: Dict, method: str = 'sha1') -> str:
        """Generate signature for transaction data"""
        # Sort parameters alphabetically
        sorted_params = sorted(data.items())
        param_string = '&'.join([f"{key}={value}" for key, value in sorted_params])
        
        # Add API key
        param_string += f"&apiKey={self.api_key}"
        
        if method == 'sha1':
            return hashlib.sha1(param_string.encode()).hexdigest()
        elif method == 'md5':
            return base64.b64encode(hashlib.md5(param_string.encode()).digest()).decode()
        else:
            raise ValueError("Signature method must be 'sha1' or 'md5'")
    
    def create_transaction(self, 
                          amount: int, 
                          currency: str = 'MVR',
                          local_id: str = None,
                          customer_reference: str = None,
                          redirect_url: str = None,
                          provider: str = 'bml_epos') -> Tuple[bool, Dict]:
        """
        Create a new transaction
        
        Args:
            amount: Amount in cents (e.g., 2000 = 20.00)
            currency: Currency code (default: MVR)
            local_id: Local reference ID
            customer_reference: Customer reference
            redirect_url: Redirect URL after payment
            provider: Payment provider (default: bml_epos)
        
        Returns:
            Tuple of (success, response_data)
        """
        try:
            # Prepare transaction data
            transaction_data = {
                'amount': amount,
                'currency': currency,
                'deviceId': self.client_id,
                'appVersion': 'nashath-booking-1.0',
                'apiVersion': '2.0',
                'signMethod': 'sha1',
                'provider': provider
            }
            
            # Add optional fields
            if local_id:
                transaction_data['localId'] = local_id
            if customer_reference:
                transaction_data['customerReference'] = customer_reference
            if redirect_url:
                transaction_data['redirectUrl'] = redirect_url
            
            # Generate signature
            signature = self._generate_signature(transaction_data)
            transaction_data['signature'] = signature
            
            # Make API request
            url = f"{self.base_url}/transactions"
            response = requests.post(url, json=transaction_data, headers=self._get_headers())
            
            if response.status_code == 200:
                return True, response.json()
            else:
                return False, {
                    'error': f'BML API Error: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            return False, {
                'error': f'BML Gateway Error: {str(e)}'
            }
    
    def get_transaction(self, transaction_id: str) -> Tuple[bool, Dict]:
        """
        Get transaction details
        
        Args:
            transaction_id: BML transaction ID
        
        Returns:
            Tuple of (success, response_data)
        """
        try:
            url = f"{self.base_url}/transactions/{transaction_id}"
            response = requests.get(url, headers=self._get_headers())
            
            if response.status_code == 200:
                return True, response.json()
            else:
                return False, {
                    'error': f'BML API Error: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            return False, {
                'error': f'BML Gateway Error: {str(e)}'
            }
    
    def list_transactions(self, page: int = 1) -> Tuple[bool, Dict]:
        """
        List transactions
        
        Args:
            page: Page number
        
        Returns:
            Tuple of (success, response_data)
        """
        try:
            url = f"{self.base_url}/transactions?page={page}"
            response = requests.get(url, headers=self._get_headers())
            
            if response.status_code == 200:
                return True, response.json()
            else:
                return False, {
                    'error': f'BML API Error: {response.status_code}',
                    'details': response.text
                }
                
        except Exception as e:
            return False, {
                'error': f'BML Gateway Error: {str(e)}'
            }
    
    def verify_webhook_signature(self, data: Dict, signature: str, method: str = 'sha1') -> bool:
        """
        Verify webhook signature
        
        Args:
            data: Webhook data
            signature: Received signature
            method: Signature method
        
        Returns:
            True if signature is valid
        """
        try:
            # Remove signature from data for verification
            data_copy = data.copy()
            if 'signature' in data_copy:
                del data_copy['signature']
            
            # Generate expected signature
            expected_signature = self._generate_signature(data_copy, method)
            
            return expected_signature == signature
            
        except Exception:
            return False

# Utility functions for amount conversion
def mvr_to_cents(amount: float) -> int:
    """Convert MVR amount to cents"""
    return int(amount * 100)

def cents_to_mvr(cents: int) -> float:
    """Convert cents to MVR amount"""
    return cents / 100.0 