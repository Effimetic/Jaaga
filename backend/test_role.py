#!/usr/bin/env python3
"""
Test script to verify role fetching from the database
"""

from app import app, db
from models import User
from utils import get_user_by_phone

def test_role_fetching():
    with app.app_context():
        print("🔍 Testing role fetching...")
        
        # Test with existing users
        test_phones = [
            "+960 7779186",  # Ali Nashath (owner)
            "+9607779186",   # Same phone without space
            "+9601234567",   # Test User (public)
            "+960 1234567"   # Same phone with space
        ]
        
        for phone in test_phones:
            print(f"\n📱 Testing phone: '{phone}'")
            user = get_user_by_phone(phone)
            if user:
                print(f"✅ User found: ID={user.id}, Name='{user.name}', Role='{user.role}'")
            else:
                print(f"❌ No user found for phone: '{phone}'")
        
        # Test direct database query
        print(f"\n🔍 Direct database query:")
        users = User.query.all()
        for user in users:
            print(f"  - ID: {user.id}, Name: '{user.name}', Phone: '{user.phone}', Role: '{user.role}'")

if __name__ == "__main__":
    test_role_fetching()
