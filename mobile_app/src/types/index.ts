// Core Types for Nashath Booking Mobile App

export interface User {
  id: number;
  role: string; // Allow any string role, will be normalized in AuthContext
  name: string;
  email?: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  authenticated: boolean;
  created_at: string;
  last_login?: string;
}

export interface Agent {
  id: number;
  user_id: number;
  display_name: string;
  logo_url?: string;
  contact_info: {
    email?: string;
    address?: string;
    business_registration?: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Owner {
  id: number;
  user_id: number;
  brand_name: string;
  logo_url?: string;
  tax_config_id?: number;
  payment_config_id?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface AgentOwnerLink {
  id: number;
  agent_id: number;
  owner_id: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
  credit_limit: number;
  credit_currency: string;
  payment_terms_days: number;
  payment_methods_allowed: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  agent: {
    id: number;
    name: string;
    phone: string;
    display_name: string;
  };
  owner: {
    id: number;
    name: string;
    phone: string;
    brand_name: string;
  };
}

export interface Boat {
  id: number;
  owner_id: number;
  name: string;
  seat_mode: 'SEATMAP' | 'CAPACITY';
  capacity: number;
  seat_map_json?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: number;
  boat_id: number;
  owner_id: number;
  name: string;
  date_time_start: string;
  segments: ScheduleSegment[];
  recurrence?: {
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    end_date?: string;
    days_of_week?: number[];
  };
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
  boat: Boat;
  owner: User;
  available_seats: number;
  total_seats: number;
  created_at: string;
}

export interface ScheduleSegment {
  id: number;
  schedule_id: number;
  pickup: string;
  dropoff: string;
  eta: string;
  sequence_order: number;
  is_pickup: boolean;
  is_dropoff: boolean;
}

export interface Fare {
  id: number;
  owner_id: number;
  schedule_id?: number;
  ticket_type: string;
  currency: string;
  base_price: number;
  tax_rule_id?: number;
  rules_json?: string;
}

export interface TicketType {
  id: number;
  owner_id: number;
  name: string;
  code: string;
  base_price: number;
  currency: string;
  refundable: boolean;
  baggage_rules?: any;
  active: boolean;
}

export interface Booking {
  id: number;
  code: string;
  created_by: 'PUBLIC' | 'AGENT' | 'OWNER';
  creator_id: number;
  owner_id: number;
  schedule_id: number;
  segment_id?: number;
  seat_mode: 'SEATMAP' | 'CAPACITY';
  seats: number[] | number;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  channel: 'WEB' | 'AGENT_PORTAL' | 'OWNER_PORTAL' | 'MOBILE';
  status: 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';
  payment_status: 'UNPAID' | 'PARTIAL' | 'PAID';
  pay_method?: string;
  agent_owner_link_id?: number;
  buyer_name: string;
  buyer_phone: string;
  buyer_national_id?: string;
  created_at: string;
  updated_at: string;
  schedule: Schedule;
  tickets: Ticket[];
}

export interface Ticket {
  id: number;
  booking_id: number;
  passenger_name: string;
  passenger_phone?: string;
  ticket_type: string;
  seat_id?: number;
  seat_number?: string;
  qr_code: string;
  status: 'ISSUED' | 'VOID' | 'USED' | 'REFUNDED';
  created_at: string;
}

export interface LedgerEntry {
  id: number;
  owner_id: number;
  counterparty_type: 'AGENT' | 'PUBLIC' | 'APP';
  counterparty_id: number;
  booking_id?: number;
  ticket_id?: number;
  currency: string;
  amount: number;
  dr_account: string;
  cr_account: string;
  memo: string;
  timestamp: string;
}

export interface PaymentReceipt {
  id: number;
  owner_id: number;
  from_type: 'AGENT' | 'PUBLIC' | 'OWNER_TO_APP';
  from_id: number;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  status: 'RECORDED' | 'VERIFIED' | 'REJECTED';
  attachments: string[];
  created_at: string;
}

export interface TaxConfig {
  id: number;
  owner_id: number;
  rate_percent: number;
  inclusive: boolean;
  tax_name: string;
  active: boolean;
}

export interface PaymentConfig {
  id: number;
  owner_id: number;
  methods_enabled: string[];
  gateway_keys_masked: any;
}

export interface AppFeeRule {
  id: number;
  fee_per_ticket_fixed: number;
  currency: string;
  active: boolean;
}

export interface OwnerFeeBalance {
  owner_id: number;
  currency: string;
  fee_accrued: number;
  fee_paid: number;
  fee_outstanding: number;
  threshold_suspend_amount: number;
}

// Search and Filter Types
export interface SearchParams {
  mode: 'BOAT' | 'DESTINATION';
  from?: string;
  to?: string;
  date?: string;
  passengers?: number;
  departure_time?: string;
}

export interface SearchResult {
  schedule: Schedule;
  segments: ScheduleSegment[];
  fares: Fare[];
  availability: {
    total_seats: number;
    available_seats: number;
    seat_map?: any;
  };
  min_price: number;
  currency: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Form Types
export interface BookingFormData {
  schedule_id: number;
  segment_id?: number;
  ticket_types: Array<{
    ticket_type_id: number;
    quantity: number;
  }>;
  passengers: Array<{
    name: string;
    phone?: string;
    ticket_type_id: number;
    seat_id?: number;
  }>;
  buyer_name: string;
  buyer_phone: string;
  buyer_national_id?: string;
  payment_method?: string;
  agent_id?: number;
}

export interface ScheduleFormData {
  name: string;
  boat_id: number;
  date_time_start: string;
  segments: Array<{
    pickup: string;
    dropoff: string;
    eta: string;
    is_pickup: boolean;
    is_dropoff: boolean;
  }>;
  recurrence?: {
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    end_date?: string;
    days_of_week?: number[];
  };
  ticket_types: number[];
  tax_config_id?: number;
}

// Navigation Types
export type RootStackParamList = {
  // Public Screens
  Home: undefined;
  Login: undefined;
  Register: undefined;
  SearchResults: { searchParams: SearchParams };
  BookingFlow: { scheduleId: number; segmentId?: number };
  
  // Authenticated Screens
  MainTabs: undefined;
  Dashboard: undefined;
  MyTickets: undefined;
  MyBookings: undefined;
  Profile: undefined;
  
  // Agent Screens
  AgentDashboard: undefined;
  AgentConnections: undefined;
  AgentBookings: undefined;
  AgentAccountBook: undefined;
  AgentSettings: undefined;
  RequestConnection: undefined;
  UploadPaymentSlip: { ownerId: number };
  
  // Owner Screens
  OwnerDashboard: undefined;
  BoatManagement: undefined;
  AddBoat: undefined;
  EditBoat: { boatId: number };
  ViewBoat: { boatId: number };
  ScheduleManagement: undefined;
  CreateSchedule: undefined;
  EditSchedule: { scheduleId: number };
  ViewSchedule: { scheduleId: number };
  ScheduleBookings: { scheduleId: number };
  CreateBooking: { scheduleId: number };
  IssueTicket: { bookingId: number };
  OwnerSettings: undefined;
  AgentManagement: undefined;
  OwnerAccountBook: undefined;
  PaymentReceipts: undefined;
  
  // App Owner Screens
  AppOwnerDashboard: undefined;
  OwnerManagement: undefined;
  PlatformSettings: undefined;
  FeeManagement: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Bookings: undefined;
  Account: undefined;
};