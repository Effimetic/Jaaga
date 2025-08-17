#!/usr/bin/env python3
"""Migration script for Unified Booking System"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Run the complete migration"""
    db_path = 'instance/demo.db'
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at {db_path}")
        return False
    
    print("🔄 Starting Unified Booking System migration...")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Create new tables
        print("📋 Creating new unified booking tables...")
        create_unified_booking_tables(cursor)
        
        # 2. Update existing tables
        print("🔧 Updating existing tables...")
        update_existing_tables(cursor)
        
        # 3. Seed default data
        print("🌱 Seeding default data...")
        seed_default_data(cursor)
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

def create_unified_booking_tables(cursor):
    """Create all new unified booking tables"""
    
    # Ticket Types table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ticket_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(10) NOT NULL UNIQUE,
            base_price DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'MVR',
            refundable BOOLEAN DEFAULT 1,
            baggage_rules TEXT DEFAULT '{}',
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES user (id)
        )
    ''')
    
    # Tax Profiles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tax_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            name VARCHAR(100) NOT NULL,
            lines TEXT NOT NULL,
            rounding_rule VARCHAR(20) DEFAULT 'ROUND_UP',
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES user (id)
        )
    ''')
    
    # Schedule Ticket Types junction table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schedule_ticket_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            schedule_id INTEGER NOT NULL,
            ticket_type_id INTEGER NOT NULL,
            surcharge DECIMAL(10,2) DEFAULT 0,
            discount DECIMAL(10,2) DEFAULT 0,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (schedule_id) REFERENCES schedule (id),
            FOREIGN KEY (ticket_type_id) REFERENCES ticket_types (id)
        )
    ''')
    
    # Unified Bookings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(6) NOT NULL UNIQUE,
            owner_id INTEGER NOT NULL,
            schedule_id INTEGER NOT NULL,
            channel VARCHAR(20) NOT NULL,
            created_by_user_id INTEGER,
            agent_id INTEGER,
            buyer_name VARCHAR(200) NOT NULL,
            buyer_phone VARCHAR(20) NOT NULL,
            buyer_national_id VARCHAR(50),
            line_items TEXT NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            tax_total DECIMAL(10,2) NOT NULL,
            discount_total DECIMAL(10,2) NOT NULL,
            grand_total DECIMAL(10,2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'MVR',
            payment_status VARCHAR(20) DEFAULT 'PENDING',
            fulfillment_status VARCHAR(20) DEFAULT 'UNCONFIRMED',
            finance_status VARCHAR(20) DEFAULT 'UNPOSTED',
            meta TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES user (id),
            FOREIGN KEY (schedule_id) REFERENCES schedule (id),
            FOREIGN KEY (created_by_user_id) REFERENCES user (id),
            FOREIGN KEY (agent_id) REFERENCES user (id)
        )
    ''')

def update_existing_tables(cursor):
    """Update existing tables with new fields"""
    
    # Add new fields to Schedule table if they don't exist
    try:
        cursor.execute('ALTER TABLE schedule ADD COLUMN tax_profile_id INTEGER')
        print("  ✅ Added tax_profile_id to schedule table")
    except sqlite3.OperationalError:
        print("  ℹ️  tax_profile_id already exists in schedule table")

def seed_default_data(cursor):
    """Seed default data for the new system"""
    
    # Update existing App Owner Settings with new fields
    try:
        cursor.execute('ALTER TABLE app_owner_settings ADD COLUMN per_booking_fee_mvr DECIMAL(10,2) DEFAULT 10.00')
        print("  ✅ Added per_booking_fee_mvr to app_owner_settings table")
    except sqlite3.OperationalError:
        print("  ℹ️  per_booking_fee_mvr already exists in app_owner_settings table")
    
    try:
        cursor.execute('ALTER TABLE app_owner_settings ADD COLUMN retain_fee_on_refund BOOLEAN DEFAULT 0')
        print("  ✅ Added retain_fee_on_refund to app_owner_settings table")
    except sqlite3.OperationalError:
        print("  ℹ️  retain_fee_on_refund already exists in app_owner_settings table")
    
    try:
        cursor.execute('ALTER TABLE app_owner_settings ADD COLUMN settlement_cycle VARCHAR(20) DEFAULT "MONTHLY"')
        print("  ✅ Added settlement_cycle to app_owner_settings table")
    except sqlite3.OperationalError:
        print("  ℹ️  settlement_cycle already exists in app_owner_settings table")
    
    # Update existing record or create new one
    cursor.execute('''
        INSERT OR REPLACE INTO app_owner_settings 
        (id, app_name, commission_rate, commission_currency, is_active, per_booking_fee_mvr, retain_fee_on_refund, settlement_cycle)
        VALUES (1, 'Nashath Booking', 10.00, 'MVR', 1, 10.00, 0, 'MONTHLY')
    ''')

if __name__ == '__main__':
    migrate_database()
