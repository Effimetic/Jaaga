import { Database } from './database';

// Database row types
export type User = Database['public']['Tables']['users']['Row'];
export type Agent = Database['public']['Tables']['agents']['Row'];
export type Owner = Database['public']['Tables']['owners']['Row'];
export type AgentOwnerLink = Database['public']['Tables']['agent_owner_links']['Row'];
export type Boat = Database['public']['Tables']['boats']['Row'];
export type Schedule = Database['public']['Tables']['schedules']['Row'];
export type TicketType = Database['public']['Tables']['ticket_types']['Row'];
export type ScheduleTicketType = Database['public']['Tables']['schedule_ticket_types']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type BookingItem = Database['public']['Tables']['booking_items']['Row'];
export type Ticket = Database['public']['Tables']['tickets']['Row'];
export type LedgerEntry = Database['public']['Tables']['ledger_entries']['Row'];
export type PaymentConfig = Database['public']['Tables']['payment_configs']['Row'];
export type OwnerBankAccount = Database['public']['Tables']['owner_bank_accounts']['Row'];
export type PaymentReceipt = Database['public']['Tables']['payment_receipts']['Row'];
export type TaxConfig = Database['public']['Tables']['tax_configs']['Row'];
export type AppFeeRule = Database['public']['Tables']['app_fee_rules']['Row'];
export type OwnerFeeBalance = Database['public']['Tables']['owner_fee_balances']['Row'];
export type GatewayTransaction = Database['public']['Tables']['gateway_transactions']['Row'];
export type TransferSlipOCR = Database['public']['Tables']['transfer_slip_ocr']['Row'];

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type AgentInsert = Database['public']['Tables']['agents']['Insert'];
export type OwnerInsert = Database['public']['Tables']['owners']['Insert'];
export type BoatInsert = Database['public']['Tables']['boats']['Insert'];
export type ScheduleInsert = Database['public']['Tables']['schedules']['Insert'];
export type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
export type TicketInsert = Database['public']['Tables']['tickets']['Insert'];

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type BookingUpdate = Database['public']['Tables']['bookings']['Update'];
export type TicketUpdate = Database['public']['Tables']['tickets']['Update'];

// Enums
export type UserRole = 'PUBLIC' | 'AGENT' | 'OWNER' | 'APP_OWNER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type LinkStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
export type SeatMode = 'SEATMAP' | 'CAPACITY';
export type BookingStatus = 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type PaymentMethod = 'CASH' | 'CARD_BML' | 'BANK_TRANSFER';
export type Channel = 'WEB' | 'AGENT_PORTAL' | 'OWNER_PORTAL';
export type TicketStatus = 'ISSUED' | 'USED' | 'VOID' | 'REFUNDED';
export type ReceiptStatus = 'RECORDED' | 'VERIFIED' | 'REJECTED';
export type TransactionStatus = 'INITIATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED';

// Application specific types
export interface SeatMap {
  rows: number;
  columns: number;
  seats: Seat[];
  layout?: string[][];
}

export interface Seat {
  id: string;
  row: number;
  column: number;
  type: 'regular' | 'premium' | 'disabled';
  available: boolean;
  price_multiplier?: number;
}

export interface RouteSegment {
  id: string;
  from: string;
  to: string;
  departure_time: string;
  arrival_time: string;
  distance?: number;
  duration_minutes: number;
}

export interface BookingRequest {
  scheduleId: string;
  segmentKey: string;
  ticketTypeId: string;
  passengers: PassengerInfo[];
  seats?: string[];
  seatCount?: number;
  paymentMethod: PaymentMethod;
}

export interface PassengerInfo {
  name: string;
  phone?: string;
  seat_id?: string;
}

export interface PricingBreakdown {
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  items: PricingItem[];
}

export interface PricingItem {
  ticket_type_id: string;
  quantity: number;
  unit_price: number;
  tax: number;
  total: number;
}

export interface QRCodeData {
  ticket_id: string;
  booking_id: string;
  owner_id: string;
  schedule_id: string;
  segment_key: string;
  seat_id?: string;
  timestamp: number;
  signature: string;
}

// Schedule Management Types
export interface RouteStop {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  order: number;
  estimated_duration?: number; // minutes to next stop
}

export interface ScheduleSegment {
  from_stop_id: string;
  to_stop_id: string;
  departure_time: string;
  arrival_time: string;
  distance?: number;
  price_multiplier?: number;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly';
  interval?: number; // every N days/weeks/months
  weekdays?: number[]; // 0=Sunday, 1=Monday, etc.
  start_date?: string;
  end_date?: string;
}

export interface ScheduleTemplate {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  route_stops: RouteStop[];
  segments: ScheduleSegment[];
  default_boat_id?: string;
  pricing_tier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Boat Management Types
export interface BoatCreateRequest {
  name: string;
  registration?: string;
  capacity: number;
  seat_mode: 'SEATMAP' | 'CAPACITY';
  seat_map_json?: SeatMap | null;
  amenities?: string[];
  description?: string;
  photos?: string[];
  primary_photo?: string;
}

export interface BoatUpdateRequest extends Partial<BoatCreateRequest> {}

// Agent and Credit Management Types
export interface CreditTransaction {
  id: string;
  agent_id: string;
  owner_id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance_after: number;
  reference_id?: string;
  reference_type?: 'BOOKING' | 'PAYMENT' | 'CREDIT_ALLOCATION' | 'CREDIT_ADJUSTMENT';
  description?: string;
  created_at: string;
  owner?: {
    brand_name: string;
    business_name: string;
  };
}

export interface CreditBalance {
  agent_id: string;
  owner_id: string;
  current_balance: number;
  credit_limit: number;
  last_updated: string;
}

export interface SearchFilters {
  from?: string;
  to?: string;
  date?: string;
  passenger_count?: number;
  max_price?: number;
  boat_type?: string;
}

export interface SearchResult {
  schedule: Schedule & {
    boat: Boat;
    owner: Owner;
    available_tickets: ScheduleTicketType[];
    available_seats: number;
  };
  pricing: PricingBreakdown;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Authentication types
export interface AuthState {
  user: User | null;
  session: any;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SMSAuthRequest {
  phone: string;
}

export interface SMSAuthVerification {
  phone: string;
  token: string;
}

// Agent specific types
export interface AgentConnection extends AgentOwnerLink {
  agent: Agent;
  owner: Owner;
}

export interface CreditSummary {
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  overdue_amount: number;
  currency: string;
}

// Owner specific types
export interface AccountBook {
  owner_id: string;
  entries: LedgerEntry[];
  summary: {
    total_revenue: number;
    total_agent_receivable: number;
    total_app_fees: number;
    outstanding_settlements: number;
    currency: string;
  };
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState {
  isValid: boolean;
  errors: ValidationError[];
  touched: Record<string, boolean>;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Home: undefined;
  Search: undefined;
  BookingFlow: {
    scheduleId: string;
    segmentKey: string;
  };
  MyTickets: undefined;
  MyBookings: undefined;
  Profile: undefined;
  AgentDashboard: undefined;
  OwnerDashboard: undefined;
  BoatManagement: undefined;
  ScheduleManagement: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Tickets: undefined;
  Bookings: undefined;
  Profile: undefined;
};

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Configuration types
export interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  sms: {
    provider: string;
    apiKey: string;
  };
  payment: {
    bml: {
      merchantId: string;
      apiKey: string;
      environment: 'sandbox' | 'production';
    };
  };
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
  };
}

export { Database };
