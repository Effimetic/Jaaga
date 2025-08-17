#!/usr/bin/env python3
"""
Migration script to add route fields to bookings table
Adds: pickup_destination_id, dropoff_destination_id, departure_time
"""

import sqlite3
import os
from datetime import datetime

def migrate():
    """Run the migration"""
    db_path = 'instance/demo.db'
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found!")
        return False
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Starting migration: Add route fields to bookings table...")
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(bookings)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'pickup_destination_id' not in columns:
            print("Adding pickup_destination_id column...")
            cursor.execute("""
                ALTER TABLE bookings 
                ADD COLUMN pickup_destination_id INTEGER 
                REFERENCES schedule_destinations(id)
            """)
        
        if 'dropoff_destination_id' not in columns:
            print("Adding dropoff_destination_id column...")
            cursor.execute("""
                ALTER TABLE bookings 
                ADD COLUMN dropoff_destination_id INTEGER 
                REFERENCES schedule_destinations(id)
            """)
        
        if 'departure_time' not in columns:
            print("Adding departure_time column...")
            cursor.execute("""
                ALTER TABLE bookings 
                ADD COLUMN departure_time DATETIME
            """)
        
        # For existing bookings, set default values
        # Set pickup to first destination and dropoff to last destination
        print("Setting default route values for existing bookings...")
        cursor.execute("""
            UPDATE bookings 
            SET pickup_destination_id = (
                SELECT MIN(id) FROM schedule_destinations 
                WHERE schedule_id = bookings.schedule_id AND is_pickup = 1
            ),
            dropoff_destination_id = (
                SELECT MAX(id) FROM schedule_destinations 
                WHERE schedule_id = bookings.schedule_id AND is_dropoff = 1
            ),
            departure_time = (
                SELECT departure_time FROM schedule_destinations 
                WHERE id = (
                    SELECT MIN(id) FROM schedule_destinations 
                    WHERE schedule_id = bookings.schedule_id AND is_pickup = 1
                )
            )
            WHERE pickup_destination_id IS NULL 
            OR dropoff_destination_id IS NULL
        """)
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Verify the changes
        cursor.execute("PRAGMA table_info(bookings)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Current columns in bookings table: {columns}")
        
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    success = migrate()
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        exit(1)
