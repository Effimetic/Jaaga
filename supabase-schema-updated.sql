-- Boat Ticketing Platform Database Schema (Updated for Accounting System)
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
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD_BML', 'BANK_TRANSFER', 'CREDIT');
CREATE TYPE channel AS ENUM ('WEB', 'AGENT', 'MOBILE');
CREATE TYPE ticket_status AS ENUM ('ISSUED', 'USED', 'VOID', 'REFUNDED');
CREATE TYPE receipt_status AS ENUM ('RECORDED', 'VERIFIED', 'REJECTED');
CREATE TYPE transaction_status AS ENUM ('INITIATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED');
CREATE TYPE counterparty_type AS ENUM ('AGENT', 'PUBLIC', 'APP');
CREATE TYPE receipt_from_type AS ENUM ('AGENT', 'PUBLIC', 'OWNER_TO_APP');

-- Accounting specific types
CREATE TYPE account_type AS ENUM ('REVENUE', 'COMMISSION', 'TAX', 'CREDIT', 'PAYABLE', 'RECEIVABLE');
CREATE TYPE reference_type AS ENUM ('BOOKING', 'PAYMENT', 'COMMISSION', 'TAX', 'CREDIT_ADJUSTMENT');
CREATE TYPE entity_type AS ENUM ('OWNER', 'AGENT', 'PLATFORM');
CREATE TYPE transaction_type AS ENUM ('BOOKING_REVENUE', 'COMMISSION_PAYOUT', 'TAX_PAYMENT', 'CREDIT_ALLOCATION', 'REFUND');
CREATE TYPE commission_type AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE financial_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

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
    registration VARCHAR(100),
    seat_mode seat_mode NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    seat_map_json JSONB,
    amenities TEXT[],
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boat Photos Table
CREATE TABLE boat_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    agent_id UUID, -- References agents(id) for agent bookings
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

-- Financial Transactions Table (NEW for Accounting System)
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    status financial_status NOT NULL DEFAULT 'PENDING',
    description TEXT NOT NULL,
    reference_type VARCHAR(100) NOT NULL,
    reference_id UUID NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger Entries Table (UPDATED for Accounting System)
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES financial_transactions(id) ON DELETE CASCADE,
    account_type account_type NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    debit_amount DECIMAL(12,2) CHECK (debit_amount >= 0),
    credit_amount DECIMAL(12,2) CHECK (credit_amount >= 0),
    description TEXT NOT NULL,
    reference_type reference_type NOT NULL,
    reference_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    entity_type entity_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_debit_credit CHECK (
        (debit_amount IS NOT NULL AND credit_amount IS NULL) OR
        (debit_amount IS NULL AND credit_amount IS NOT NULL)
    )
);

-- Commission Structures Table (NEW for Accounting System)
CREATE TABLE commission_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type entity_type NOT NULL,
    entity_id UUID, -- null for platform default
    booking_channel channel NOT NULL,
    commission_type commission_type NOT NULL,
    commission_rate DECIMAL(5,2) NOT NULL CHECK (commission_rate >= 0),
    minimum_amount DECIMAL(10,2) CHECK (minimum_amount >= 0),
    maximum_amount DECIMAL(10,2) CHECK (maximum_amount >= 0),
    effective_from TIMESTAMPTZ NOT NULL,
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Credit Balances Table (NEW for Agent Credit System)
CREATE TABLE agent_credit_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, owner_id)
);

-- Agent Credit Transactions Table (NEW for Agent Credit System)
CREATE TABLE agent_credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'CREDIT', 'DEBIT', 'ALLOCATION', 'ADJUSTMENT'
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'MVR',
    description TEXT NOT NULL,
    reference_id UUID, -- booking_id, allocation_id, etc.
    balance_after DECIMAL(12,2) NOT NULL,
    processed_by UUID REFERENCES users(id),
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
CREATE INDEX idx_boat_photos_boat_id ON boat_photos(boat_id);
CREATE INDEX idx_schedules_owner_id ON schedules(owner_id);
CREATE INDEX idx_schedules_boat_id ON schedules(boat_id);
CREATE INDEX idx_schedules_start_at ON schedules(start_at);
CREATE INDEX idx_bookings_creator_id ON bookings(creator_id);
CREATE INDEX idx_bookings_agent_id ON bookings(agent_id);
CREATE INDEX idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX idx_bookings_schedule_id ON bookings(schedule_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_tickets_booking_id ON tickets(booking_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_transactions_reference ON financial_transactions(reference_type, reference_id);
CREATE INDEX idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_entries_entity ON ledger_entries(entity_type, entity_id);
CREATE INDEX idx_ledger_entries_reference ON ledger_entries(reference_type, reference_id);
CREATE INDEX idx_commission_structures_entity ON commission_structures(entity_type, entity_id);
CREATE INDEX idx_commission_structures_channel ON commission_structures(booking_channel);
CREATE INDEX idx_agent_credit_balances_agent_owner ON agent_credit_balances(agent_id, owner_id);
CREATE INDEX idx_agent_credit_transactions_agent_id ON agent_credit_transactions(agent_id);
CREATE INDEX idx_agent_credit_transactions_owner_id ON agent_credit_transactions(owner_id);
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
CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON financial_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_structures_updated_at BEFORE UPDATE ON commission_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_credit_balances_updated_at BEFORE UPDATE ON agent_credit_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_fee_rules_updated_at BEFORE UPDATE ON app_fee_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_owner_fee_balances_updated_at BEFORE UPDATE ON owner_fee_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_owner_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_photos ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credit_transactions ENABLE ROW LEVEL SECURITY;
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

-- Insert default commission structures
INSERT INTO commission_structures (entity_type, entity_id, booking_channel, commission_type, commission_rate, effective_from) VALUES
('PLATFORM', NULL, 'WEB', 'PERCENTAGE', 5.0, NOW()),
('PLATFORM', NULL, 'MOBILE', 'PERCENTAGE', 5.0, NOW()),
('PLATFORM', NULL, 'AGENT', 'PERCENTAGE', 5.0, NOW()),
('AGENT', NULL, 'WEB', 'PERCENTAGE', 3.0, NOW()),
('AGENT', NULL, 'MOBILE', 'PERCENTAGE', 3.0, NOW()),
('AGENT', NULL, 'AGENT', 'PERCENTAGE', 3.0, NOW());

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

-- Create function to update agent credit balance
CREATE OR REPLACE FUNCTION update_agent_credit_balance()
RETURNS trigger AS $$
BEGIN
    -- Update the balance in agent_credit_balances table
    UPDATE agent_credit_balances 
    SET 
        current_balance = NEW.balance_after,
        last_updated = NOW()
    WHERE agent_id = NEW.agent_id AND owner_id = NEW.owner_id;
    
    -- If no balance record exists, create one
    IF NOT FOUND THEN
        INSERT INTO agent_credit_balances (agent_id, owner_id, current_balance, last_updated)
        VALUES (NEW.agent_id, NEW.owner_id, NEW.balance_after, NOW());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for agent credit transactions
CREATE TRIGGER update_agent_balance_trigger
    AFTER INSERT ON agent_credit_transactions
    FOR EACH ROW EXECUTE FUNCTION update_agent_credit_balance();
