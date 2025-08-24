def get_user_by_phone(phone):
    """
    Helper function to get user by phone number with consistent formatting.
    Handles both formats: +9607779186 and +960 7779186
    """
    from models import User
    
    if not phone:
        return None
    
    # Clean phone number (remove spaces and ensure consistent format)
    clean_phone = phone.replace(' ', '') if phone else ''
    
    # Try to find user by clean phone number first
    user = User.query.filter_by(phone=clean_phone).first()
    if user:
        return user
    
    # If not found, try with space format
    if len(clean_phone) >= 4:
        spaced_phone = f"{clean_phone[:4]} {clean_phone[4:]}"
        user = User.query.filter_by(phone=spaced_phone).first()
        if user:
            return user
    
    return None

def clean_phone_number(phone):
    """
    Clean phone number by removing spaces for consistent storage and comparison
    """
    if not phone:
        return ''
    return phone.replace(' ', '')

