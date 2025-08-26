export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone: string;
          role: 'PUBLIC' | 'AGENT' | 'OWNER' | 'APP_OWNER';
          status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone: string;
          role: 'PUBLIC' | 'AGENT' | 'OWNER' | 'APP_OWNER';
          status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
        };
        Update: {
          phone?: string;
          role?: 'PUBLIC' | 'AGENT' | 'OWNER' | 'APP_OWNER';
          status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
        };
      };
      agents: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          logo_url?: string;
          contact_info?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          logo_url?: string;
          contact_info?: string;
        };
        Update: {
          display_name?: string;
          logo_url?: string;
          contact_info?: string;
        };
      };
      owners: {
        Row: {
          id: string;
          user_id: string;
          brand_name: string;
          logo_url?: string;
          status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
          tax_config_id?: string;
          payment_config_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          brand_name: string;
          logo_url?: string;
          status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
          tax_config_id?: string;
          payment_config_id?: string;
        };
        Update: {
          brand_name?: string;
          logo_url?: string;
          status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
          tax_config_id?: string;
          payment_config_id?: string;
        };
      };
      agent_owner_links: {
        Row: {
          id: string;
          agent_id: string;
          owner_id: string;
          status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
          active: boolean;
          credit_limit: number;
          credit_currency: string;
          settlement_currency: string;
          payment_terms_days: number;
          allowed_payment_methods: string[];
          allowed_ticket_type_ids: string[];
          forced_ticket_type_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id: string;
          owner_id: string;
          status?: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
          active?: boolean;
          credit_limit: number;
          credit_currency: string;
          settlement_currency: string;
          payment_terms_days: number;
          allowed_payment_methods: string[];
          allowed_ticket_type_ids?: string[];
          forced_ticket_type_id?: string;
        };
        Update: {
          status?: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'BLOCKED';
          active?: boolean;
          credit_limit?: number;
          credit_currency?: string;
          settlement_currency?: string;
          payment_terms_days?: number;
          allowed_payment_methods?: string[];
          allowed_ticket_type_ids?: string[];
          forced_ticket_type_id?: string;
        };
      };
      boats: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          registration?: string;
          seat_mode: 'SEATMAP' | 'CAPACITY';
          capacity: number;
          seat_map_json?: any;
          amenities?: string[];
          description?: string;
          photos?: string[];
          primary_photo?: string;
          status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          registration?: string;
          seat_mode: 'SEATMAP' | 'CAPACITY';
          capacity: number;
          seat_map_json?: any;
          amenities?: string[];
          description?: string;
          photos?: string[];
          primary_photo?: string;
          status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
        };
        Update: {
          name?: string;
          registration?: string;
          seat_mode?: 'SEATMAP' | 'CAPACITY';
          capacity?: number;
          seat_map_json?: any;
          amenities?: string[];
          description?: string;
          photos?: string[];
          primary_photo?: string;
          status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
        };
      };
      schedules: {
        Row: {
          id: string;
          owner_id: string;
          boat_id: string;
          start_at: string;
          segments: any;
          recurrence?: any;
          status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
          inherits_pricing: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          boat_id: string;
          start_at: string;
          segments: any;
          recurrence?: any;
          status?: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
          inherits_pricing?: boolean;
        };
        Update: {
          boat_id?: string;
          start_at?: string;
          segments?: any;
          recurrence?: any;
          status?: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
          inherits_pricing?: boolean;
        };
      };
      ticket_types: {
        Row: {
          id: string;
          owner_id: string;
          code: string;
          name: string;
          currency: string;
          base_price: number;
          tax_rule_id?: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          code: string;
          name: string;
          currency: string;
          base_price: number;
          tax_rule_id?: string;
          active?: boolean;
        };
        Update: {
          code?: string;
          name?: string;
          currency?: string;
          base_price?: number;
          tax_rule_id?: string;
          active?: boolean;
        };
      };
      schedule_ticket_types: {
        Row: {
          id: string;
          schedule_id: string;
          ticket_type_id: string;
          active: boolean;
          price_override?: number;
          tax_override_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          schedule_id: string;
          ticket_type_id: string;
          active?: boolean;
          price_override?: number;
          tax_override_id?: string;
        };
        Update: {
          active?: boolean;
          price_override?: number;
          tax_override_id?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          created_by_role: 'PUBLIC' | 'AGENT' | 'OWNER' | 'APP_OWNER';
          creator_id: string;
          owner_id: string;
          schedule_id: string;
          segment_key: string;
          seat_mode: 'SEATMAP' | 'CAPACITY';
          seats: string[];
          seat_count: number;
          subtotal: number;
          tax: number;
          total: number;
          currency: string;
          channel: 'WEB' | 'AGENT_PORTAL' | 'OWNER_PORTAL';
          status: 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';
          payment_status: 'UNPAID' | 'PARTIAL' | 'PAID';
          pay_method?: string;
          agent_owner_link_id?: string;
          hold_expires_at?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by_role: 'PUBLIC' | 'AGENT' | 'OWNER' | 'APP_OWNER';
          creator_id: string;
          owner_id: string;
          schedule_id: string;
          segment_key: string;
          seat_mode: 'SEATMAP' | 'CAPACITY';
          seats: string[];
          seat_count: number;
          subtotal: number;
          tax: number;
          total: number;
          currency: string;
          channel: 'WEB' | 'AGENT_PORTAL' | 'OWNER_PORTAL';
          status?: 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';
          payment_status?: 'UNPAID' | 'PARTIAL' | 'PAID';
          pay_method?: string;
          agent_owner_link_id?: string;
          hold_expires_at?: string;
        };
        Update: {
          status?: 'PENDING' | 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';
          payment_status?: 'UNPAID' | 'PARTIAL' | 'PAID';
          pay_method?: string;
          hold_expires_at?: string;
        };
      };
      booking_items: {
        Row: {
          id: string;
          booking_id: string;
          ticket_type_id: string;
          qty: number;
          unit_price: number;
          tax: number;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          ticket_type_id: string;
          qty: number;
          unit_price: number;
          tax: number;
          total: number;
        };
        Update: {
          qty?: number;
          unit_price?: number;
          tax?: number;
          total?: number;
        };
      };
      tickets: {
        Row: {
          id: string;
          booking_id: string;
          passenger_name: string;
          passenger_phone?: string;
          ticket_type_id: string;
          seat_id?: string;
          qr_code: string;
          status: 'ISSUED' | 'USED' | 'VOID' | 'REFUNDED';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          passenger_name: string;
          passenger_phone?: string;
          ticket_type_id: string;
          seat_id?: string;
          qr_code: string;
          status?: 'ISSUED' | 'USED' | 'VOID' | 'REFUNDED';
        };
        Update: {
          passenger_name?: string;
          passenger_phone?: string;
          status?: 'ISSUED' | 'USED' | 'VOID' | 'REFUNDED';
        };
      };
      ledger_entries: {
        Row: {
          id: string;
          owner_id: string;
          counterparty_type: 'AGENT' | 'PUBLIC' | 'APP';
          counterparty_id?: string;
          booking_id?: string;
          ticket_id?: string;
          currency: string;
          amount: number;
          dr_account: string;
          cr_account: string;
          memo?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          counterparty_type: 'AGENT' | 'PUBLIC' | 'APP';
          counterparty_id?: string;
          booking_id?: string;
          ticket_id?: string;
          currency: string;
          amount: number;
          dr_account: string;
          cr_account: string;
          memo?: string;
        };
        Update: {
          memo?: string;
        };
      };
      payment_configs: {
        Row: {
          id: string;
          owner_id: string;
          public_allowed_methods: string[];
          agent_allowed_methods: string[];
          owner_portal_allowed_methods: string[];
          bml_keys_masked?: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          public_allowed_methods: string[];
          agent_allowed_methods: string[];
          owner_portal_allowed_methods: string[];
          bml_keys_masked?: any;
        };
        Update: {
          public_allowed_methods?: string[];
          agent_allowed_methods?: string[];
          owner_portal_allowed_methods?: string[];
          bml_keys_masked?: any;
        };
      };
      owner_bank_accounts: {
        Row: {
          id: string;
          owner_id: string;
          currency: string;
          bank_name: string;
          account_name: string;
          account_no: string;
          iban?: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          currency: string;
          bank_name: string;
          account_name: string;
          account_no: string;
          iban?: string;
          active?: boolean;
        };
        Update: {
          currency?: string;
          bank_name?: string;
          account_name?: string;
          account_no?: string;
          iban?: string;
          active?: boolean;
        };
      };
      payment_receipts: {
        Row: {
          id: string;
          owner_id: string;
          from_type: 'AGENT' | 'PUBLIC' | 'OWNER_TO_APP';
          from_id?: string;
          amount: number;
          currency: string;
          method: 'CASH' | 'CARD_BML' | 'BANK_TRANSFER';
          reference?: string;
          status: 'RECORDED' | 'VERIFIED' | 'REJECTED';
          to_account_id?: string;
          attachments: string[];
          ocr_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          from_type: 'AGENT' | 'PUBLIC' | 'OWNER_TO_APP';
          from_id?: string;
          amount: number;
          currency: string;
          method: 'CASH' | 'CARD_BML' | 'BANK_TRANSFER';
          reference?: string;
          status?: 'RECORDED' | 'VERIFIED' | 'REJECTED';
          to_account_id?: string;
          attachments?: string[];
          ocr_id?: string;
        };
        Update: {
          status?: 'RECORDED' | 'VERIFIED' | 'REJECTED';
          reference?: string;
          attachments?: string[];
        };
      };
      tax_configs: {
        Row: {
          id: string;
          owner_id: string;
          tax_name: string;
          rate_percent: number;
          inclusive: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          tax_name: string;
          rate_percent: number;
          inclusive?: boolean;
          active?: boolean;
        };
        Update: {
          tax_name?: string;
          rate_percent?: number;
          inclusive?: boolean;
          active?: boolean;
        };
      };
      app_fee_rules: {
        Row: {
          id: string;
          fee_per_ticket_fixed: number;
          currency: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fee_per_ticket_fixed: number;
          currency: string;
          active?: boolean;
        };
        Update: {
          fee_per_ticket_fixed?: number;
          currency?: string;
          active?: boolean;
        };
      };
      owner_fee_balances: {
        Row: {
          owner_id: string;
          currency: string;
          fee_accrued: number;
          fee_paid: number;
          fee_outstanding: number;
          threshold_suspend_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          currency: string;
          fee_accrued?: number;
          fee_paid?: number;
          fee_outstanding?: number;
          threshold_suspend_amount: number;
        };
        Update: {
          fee_accrued?: number;
          fee_paid?: number;
          fee_outstanding?: number;
          threshold_suspend_amount?: number;
        };
      };
      gateway_transactions: {
        Row: {
          id: string;
          owner_id: string;
          booking_id: string;
          method: 'CARD_BML';
          currency: string;
          amount: number;
          status: 'INITIATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED';
          gateway_ref?: string;
          raw_payload?: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          booking_id: string;
          method: 'CARD_BML';
          currency: string;
          amount: number;
          status?: 'INITIATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED';
          gateway_ref?: string;
          raw_payload?: any;
        };
        Update: {
          status?: 'INITIATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED';
          gateway_ref?: string;
          raw_payload?: any;
        };
      };
      transfer_slip_ocr: {
        Row: {
          id: string;
          payment_receipt_id: string;
          extracted_json: any;
          confidence: number;
          matched_account_id?: string;
          flags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          payment_receipt_id: string;
          extracted_json: any;
          confidence: number;
          matched_account_id?: string;
          flags?: string[];
        };
        Update: {
          extracted_json?: any;
          confidence?: number;
          matched_account_id?: string;
          flags?: string[];
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
