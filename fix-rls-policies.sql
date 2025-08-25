-- Fix RLS Policies for Development/Testing
-- Run this in your Supabase SQL Editor

-- Temporarily disable RLS for testing (you can re-enable later for production)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE owners DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_owner_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE boats DISABLE ROW LEVEL SECURITY;
ALTER TABLE boat_photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_ticket_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE owner_bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_slip_ocr DISABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE commission_structures DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credit_balances DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credit_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_fee_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE owner_fee_balances DISABLE ROW LEVEL SECURITY;

-- Alternative: Keep RLS enabled but create proper policies for development
-- Uncomment the lines below if you want to keep RLS enabled

/*
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

-- Create development-friendly policies
CREATE POLICY "Allow all operations for development" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON agents FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON owners FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON boats FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON schedules FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON bookings FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON tickets FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON financial_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations for development" ON ledger_entries FOR ALL USING (true);
*/
