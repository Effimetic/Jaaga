-- Boat Ticketing Platform Database Schema
-- This file contains all the database tables, functions, and policies needed for the platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('PUBLIC', 'AGENT', 'OWNER', 'APP_OWNER');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE link_status AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'BLOCKED');
CREATE TYPE seat_mode AS ENUM ('SEATMAP', 'CAPACITY');
CREATE TYPE booking_status AS ENUM ('PENDING', 'RESERVED', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'NO_SHOW');
CREATE TYPE payment_status AS ENUM ('UNPAID', 'PARTIAL', 'PAID');
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD_BML', 'BANK_TRANSFER');
CREATE TYPE channel AS ENUM ('WEB', 'AGENT_PORTAL', 'OWNER_PORTAL');
CREATE TYPE ticket_status AS ENUM ('ISSUED', 'USED', 'VOID', 'REFUNDED');
CREATE TYPE receipt_status AS ENUM ('RECORDED', 'VERIFIED', 'REJECTED');
CREATE TYPE transaction_status AS ENUM ('INITIATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED');
CREATE TYPE counterparty_type AS ENUM ('AGENT', 'PUBLIC', 'APP');
CREATE TYPE receipt_from_type AS ENUM ('AGENT', 'PUBLIC', 'OWNER_TO_APP');

-- Core Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'PUBLIC',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents Table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    contact_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owners Table
CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    brand_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    tax_config_id UUID,
    payment_config_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Owner Links Table
CREATE TABLE agent_owner_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    status link_status NOT NULL DEFAULT 'REQUESTED',
    active BOOLEAN NOT NULL DEFAULT false,
    credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
    credit_currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    settlement_currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    allowed_payment_methods TEXT[] NOT NULL DEFAULT '{}',
    allowed_ticket_type_ids UUID[] NOT NULL DEFAULT '{}',
    forced_ticket_type_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, owner_id)
);

-- Boats Table
CREATE TABLE boats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    seat_mode seat_mode NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    seat_map_json JSONB,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedules Table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
    start_at TIMESTAMPTZ NOT NULL,
    segments JSONB NOT NULL, -- Array of route segments
    recurrence JSONB, -- Recurrence rules if applicable
    status user_status NOT NULL DEFAULT 'ACTIVE',
    inherits_pricing BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax Configurations Table
CREATE TABLE tax_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    tax_name VARCHAR(100) NOT NULL,
    rate_percent DECIMAL(5,2) NOT NULL CHECK (rate_percent >= 0),
    inclusive BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Types Table
CREATE TABLE ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    base_price DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    tax_rule_id UUID REFERENCES tax_configs(id),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, code)
);

-- Schedule Ticket Types Table (for price overrides)
CREATE TABLE schedule_ticket_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT true,
    price_override DECIMAL(10,2) CHECK (price_override >= 0),
    tax_override_id UUID REFERENCES tax_configs(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(schedule_id, ticket_type_id)
);

-- Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by_role user_role NOT NULL,
    creator_id UUID NOT NULL, -- References users(id)
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    segment_key VARCHAR(100) NOT NULL, -- Which route segment
    seat_mode seat_mode NOT NULL,
    seats TEXT[] NOT NULL DEFAULT '{}', -- Array of seat IDs for SEATMAP mode
    seat_count INTEGER NOT NULL DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    channel channel NOT NULL,
    status booking_status NOT NULL DEFAULT 'PENDING',
    payment_status payment_status NOT NULL DEFAULT 'UNPAID',
    pay_method payment_method,
    agent_owner_link_id UUID REFERENCES agent_owner_links(id),
    hold_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking Items Table
CREATE TABLE booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets Table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    passenger_name VARCHAR(255) NOT NULL,
    passenger_phone VARCHAR(20),
    ticket_type_id UUID REFERENCES ticket_types(id) ON DELETE CASCADE,
    seat_id VARCHAR(50), -- For SEATMAP mode
    qr_code TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'ISSUED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Configurations Table
CREATE TABLE payment_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    public_allowed_methods TEXT[] NOT NULL DEFAULT '{}',
    agent_allowed_methods TEXT[] NOT NULL DEFAULT '{}',
    owner_portal_allowed_methods TEXT[] NOT NULL DEFAULT '{}',
    bml_keys_masked JSONB, -- Encrypted BML gateway keys
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owner Bank Accounts Table
CREATE TABLE owner_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_no VARCHAR(100) NOT NULL,
    iban VARCHAR(34),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Receipts Table
CREATE TABLE payment_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    from_type receipt_from_type NOT NULL,
    from_id UUID, -- References agents(id) or users(id) depending on from_type
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    method payment_method NOT NULL,
    reference VARCHAR(255),
    status receipt_status NOT NULL DEFAULT 'RECORDED',
    to_account_id UUID REFERENCES owner_bank_accounts(id),
    attachments TEXT[] NOT NULL DEFAULT '{}', -- File URLs
    ocr_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfer Slip OCR Table
CREATE TABLE transfer_slip_ocr (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_receipt_id UUID REFERENCES payment_receipts(id) ON DELETE CASCADE,
    extracted_json JSONB NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    matched_account_id UUID REFERENCES owner_bank_accounts(id),
    flags TEXT[] NOT NULL DEFAULT '{}', -- Validation flags
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gateway Transactions Table
CREATE TABLE gateway_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    method payment_method NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status transaction_status NOT NULL DEFAULT 'INITIATED',
    gateway_ref VARCHAR(255),
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger Entries Table
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    counterparty_type counterparty_type NOT NULL,
    counterparty_id UUID, -- Can reference agents(id) or be null for PUBLIC/APP
    booking_id UUID REFERENCES bookings(id),
    ticket_id UUID REFERENCES tickets(id),
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    dr_account VARCHAR(100) NOT NULL, -- Debit account code
    cr_account VARCHAR(100) NOT NULL, -- Credit account code
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Fee Rules Table
CREATE TABLE app_fee_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_per_ticket_fixed DECIMAL(10,2) NOT NULL CHECK (fee_per_ticket_fixed >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Owner Fee Balances Table
CREATE TABLE owner_fee_balances (
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    fee_accrued DECIMAL(12,2) NOT NULL DEFAULT 0,
    fee_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    fee_outstanding DECIMAL(12,2) NOT NULL DEFAULT 0,
    threshold_suspend_amount DECIMAL(12,2) NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (owner_id, currency)
);

-- Add foreign key constraints that were referenced earlier
ALTER TABLE owners ADD CONSTRAINT fk_owners_tax_config FOREIGN KEY (tax_config_id) REFERENCES tax_configs(id);
ALTER TABLE owners ADD CONSTRAINT fk_owners_payment_config FOREIGN KEY (payment_config_id) REFERENCES payment_configs(id);
ALTER TABLE agent_owner_links ADD CONSTRAINT fk_agent_owner_links_forced_ticket_type FOREIGN KEY (forced_ticket_type_id) REFERENCES ticket_types(id);
ALTER TABLE payment_receipts ADD CONSTRAINT fk_payment_receipts_ocr FOREIGN KEY (ocr_id) REFERENCES transfer_slip_ocr(id);

-- Create indexes for better performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_owners_user_id ON owners(user_id);
CREATE INDEX idx_agent_owner_links_agent_id ON agent_owner_links(agent_id);
CREATE INDEX idx_agent_owner_links_owner_id ON agent_owner_links(owner_id);
CREATE INDEX idx_boats_owner_id ON boats(owner_id);
CREATE INDEX idx_schedules_owner_id ON schedules(owner_id);
CREATE INDEX idx_schedules_boat_id ON schedules(boat_id);
CREATE INDEX idx_schedules_start_at ON schedules(start_at);
CREATE INDEX idx_bookings_creator_id ON bookings(creator_id);
CREATE INDEX idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX idx_bookings_schedule_id ON bookings(schedule_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_ledger_entries_owner_id ON ledger_entries(owner_id);
CREATE INDEX idx_ledger_entries_booking_id ON ledger_entries(booking_id);
CREATE INDEX idx_payment_receipts_owner_id ON payment_receipts(owner_id);
CREATE INDEX idx_gateway_transactions_booking_id ON gateway_transactions(booking_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_owner_links_updated_at BEFORE UPDATE ON agent_owner_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_boats_updated_at BEFORE UPDATE ON boats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tax_configs_updated_at BEFORE UPDATE ON tax_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ticket_types_updated_at BEFORE UPDATE ON ticket_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_ticket_types_updated_at BEFORE UPDATE ON schedule_ticket_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_configs_updated_at BEFORE UPDATE ON payment_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_owner_bank_accounts_updated_at BEFORE UPDATE ON owner_bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_receipts_updated_at BEFORE UPDATE ON payment_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gateway_transactions_updated_at BEFORE UPDATE ON gateway_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_fee_rules_updated_at BEFORE UPDATE ON app_fee_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_owner_fee_balances_updated_at BEFORE UPDATE ON owner_fee_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_owner_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_slip_ocr ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_fee_balances ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (can be expanded based on specific requirements)

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- Public schedules are viewable by everyone
CREATE POLICY "Public can view active schedules" ON schedules FOR SELECT USING (status = 'ACTIVE');

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid()::text = creator_id::text);
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (auth.uid()::text = creator_id::text);

-- Tickets policies
CREATE POLICY "Users can view tickets from own bookings" ON tickets FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM bookings 
        WHERE bookings.id = tickets.booking_id 
        AND bookings.creator_id::text = auth.uid()::text
    )
);

-- Insert sample data for testing
INSERT INTO users (phone, role) VALUES ('+9607777777', 'APP_OWNER');
INSERT INTO app_fee_rules (fee_per_ticket_fixed, currency) VALUES (10.00, 'MVR');

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- No additional processing needed for now
    -- Could add default settings, send welcome messages, etc.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
