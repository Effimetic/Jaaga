import cv2
import numpy as np
import pytesseract
import re
from typing import Dict, Optional, Tuple
from PIL import Image
import io
import base64

class TransferVerificationService:
    """Service for verifying bank transfers using OCR"""
    
    def __init__(self):
        # Configure tesseract path if needed
        # pytesseract.pytesseract.tesseract_cmd = r'/usr/local/bin/tesseract'
        pass
    
    def extract_text_from_image(self, image_data: bytes) -> str:
        """
        Extract text from image using OCR
        
        Args:
            image_data: Image bytes
        
        Returns:
            Extracted text
        """
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Preprocess image for better OCR
            processed_image = self._preprocess_image(opencv_image)
            
            # Extract text
            text = pytesseract.image_to_string(processed_image)
            
            return text
            
        except Exception as e:
            raise Exception(f"OCR processing failed: {str(e)}")
    
    def _preprocess_image(self, image):
        """Preprocess image for better OCR results"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply threshold to get binary image
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Remove noise
        kernel = np.ones((1, 1), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        
        return binary
    
    def parse_bml_transfer_receipt(self, text: str) -> Dict:
        """
        Parse BML transfer receipt text
        
        Args:
            text: OCR extracted text
        
        Returns:
            Parsed transfer details
        """
        result = {
            'amount': None,
            'currency': None,
            'reference': None,
            'date': None,
            'from_account': None,
            'to_account': None,
            'status': None,
            'bank_name': 'Bank of Maldives'
        }
        
        try:
            # Extract amount and currency
            amount_pattern = r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(MVR|USD)'
            amount_match = re.search(amount_pattern, text)
            if amount_match:
                result['amount'] = float(amount_match.group(1).replace(',', ''))
                result['currency'] = amount_match.group(2)
            
            # Extract reference number
            ref_pattern = r'[A-Z]{4}\d{12}'
            ref_match = re.search(ref_pattern, text)
            if ref_match:
                result['reference'] = ref_match.group(0)
            
            # Extract date
            date_pattern = r'(\d{2}/\d{2}/\d{4})\s*(\d{2}:\d{2})'
            date_match = re.search(date_pattern, text)
            if date_match:
                result['date'] = f"{date_match.group(1)} {date_match.group(2)}"
            
            # Extract from account (sender)
            from_pattern = r'From:\s*([A-Z\s]+)'
            from_match = re.search(from_pattern, text)
            if from_match:
                result['from_account'] = from_match.group(1).strip()
            
            # Extract to account (recipient)
            to_pattern = r'To:\s*([A-Z\s]+)'
            to_match = re.search(to_pattern, text)
            if to_match:
                result['to_account'] = to_match.group(1).strip()
            
            # Extract status
            if 'SUCCESS' in text.upper():
                result['status'] = 'SUCCESS'
            elif 'FAILED' in text.upper():
                result['status'] = 'FAILED'
            elif 'PENDING' in text.upper():
                result['status'] = 'PENDING'
            
            return result
            
        except Exception as e:
            raise Exception(f"Failed to parse transfer receipt: {str(e)}")
    
    def verify_transfer(self, 
                       screenshot_data: bytes, 
                       expected_amount: float,
                       expected_currency: str = 'MVR',
                       expected_account: str = None) -> Tuple[bool, Dict]:
        """
        Verify bank transfer from screenshot
        
        Args:
            screenshot_data: Transfer receipt screenshot
            expected_amount: Expected transfer amount
            expected_currency: Expected currency
            expected_account: Expected recipient account name
        
        Returns:
            Tuple of (is_valid, verification_details)
        """
        try:
            # Extract text from image
            text = self.extract_text_from_image(screenshot_data)
            
            # Parse transfer details
            transfer_details = self.parse_bml_transfer_receipt(text)
            
            # Verify transfer
            verification_result = {
                'is_valid': False,
                'transfer_details': transfer_details,
                'verification_checks': {},
                'errors': []
            }
            
            # Check amount
            if transfer_details['amount']:
                amount_match = abs(transfer_details['amount'] - expected_amount) < 0.01
                verification_result['verification_checks']['amount'] = amount_match
                if not amount_match:
                    verification_result['errors'].append(
                        f"Amount mismatch: Expected {expected_amount} {expected_currency}, "
                        f"Found {transfer_details['amount']} {transfer_details['currency']}"
                    )
            else:
                verification_result['verification_checks']['amount'] = False
                verification_result['errors'].append("Could not extract amount from receipt")
            
            # Check currency
            if transfer_details['currency']:
                currency_match = transfer_details['currency'] == expected_currency
                verification_result['verification_checks']['currency'] = currency_match
                if not currency_match:
                    verification_result['errors'].append(
                        f"Currency mismatch: Expected {expected_currency}, "
                        f"Found {transfer_details['currency']}"
                    )
            else:
                verification_result['verification_checks']['currency'] = False
                verification_result['errors'].append("Could not extract currency from receipt")
            
            # Check account (if provided)
            if expected_account and transfer_details['to_account']:
                account_match = expected_account.upper() in transfer_details['to_account'].upper()
                verification_result['verification_checks']['account'] = account_match
                if not account_match:
                    verification_result['errors'].append(
                        f"Account mismatch: Expected {expected_account}, "
                        f"Found {transfer_details['to_account']}"
                    )
            elif expected_account:
                verification_result['verification_checks']['account'] = False
                verification_result['errors'].append("Could not extract recipient account from receipt")
            
            # Check status
            if transfer_details['status']:
                status_valid = transfer_details['status'] == 'SUCCESS'
                verification_result['verification_checks']['status'] = status_valid
                if not status_valid:
                    verification_result['errors'].append(
                        f"Transfer status is {transfer_details['status']}, expected SUCCESS"
                    )
            else:
                verification_result['verification_checks']['status'] = False
                verification_result['errors'].append("Could not extract transfer status from receipt")
            
            # Overall validation
            all_checks_passed = all(verification_result['verification_checks'].values())
            verification_result['is_valid'] = all_checks_passed
            
            return all_checks_passed, verification_result
            
        except Exception as e:
            return False, {
                'is_valid': False,
                'transfer_details': {},
                'verification_checks': {},
                'errors': [f"Verification failed: {str(e)}"]
            }
    
    def extract_reference_from_text(self, text: str) -> Optional[str]:
        """Extract reference number from text"""
        ref_pattern = r'[A-Z]{4}\d{12}'
        ref_match = re.search(ref_pattern, text)
        return ref_match.group(0) if ref_match else None 