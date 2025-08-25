import { supabase } from '../config/supabase';
import {
    ApiResponse,
    Booking
} from '../types';

export interface LedgerEntry {
  id: string;
  transaction_id: string;
  account_type: 'REVENUE' | 'COMMISSION' | 'TAX' | 'CREDIT' | 'PAYABLE' | 'RECEIVABLE';
  account_name: string;
  debit_amount?: number;
  credit_amount?: number;
  description: string;
  reference_type: 'BOOKING' | 'PAYMENT' | 'COMMISSION' | 'TAX' | 'CREDIT_ADJUSTMENT';
  reference_id: string;
  entity_id: string; // owner_id, agent_id, or platform
  entity_type: 'OWNER' | 'AGENT' | 'PLATFORM';
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'BOOKING_REVENUE' | 'COMMISSION_PAYOUT' | 'TAX_PAYMENT' | 'CREDIT_ALLOCATION' | 'REFUND';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description: string;
  reference_type: string;
  reference_id: string;
  processed_at?: string;
  created_at: string;
  ledger_entries?: LedgerEntry[];
}

export interface CommissionStructure {
  id: string;
  entity_type: 'AGENT' | 'PLATFORM';
  entity_id?: string; // null for platform default
  booking_channel: 'WEB' | 'AGENT' | 'MOBILE';
  commission_type: 'PERCENTAGE' | 'FIXED';
  commission_rate: number; // percentage (0-100) or fixed amount
  minimum_amount?: number;
  maximum_amount?: number;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
}

export interface RevenueBreakdown {
  gross_revenue: number;
  platform_commission: number;
  agent_commission: number;
  owner_net_revenue: number;
  tax_amount: number;
  processing_fees: number;
}

export interface FinancialSummary {
  period: string;
  total_bookings: number;
  gross_revenue: number;
  net_revenue: number;
  platform_commission: number;
  agent_commission: number;
  tax_collected: number;
  outstanding_receivables: number;
  outstanding_payables: number;
}

export interface OwnerEarnings {
  owner_id: string;
  period: string;
  total_bookings: number;
  gross_revenue: number;
  platform_commission: number;
  agent_commission: number;
  net_earnings: number;
  tax_amount: number;
  outstanding_amount: number;
  last_payout_date?: string;
}

export interface AgentCommissions {
  agent_id: string;
  period: string;
  total_bookings: number;
  gross_commission: number;
  platform_fee: number;
  net_commission: number;
  outstanding_amount: number;
  last_payout_date?: string;
}

export class AccountingService {
  private static instance: AccountingService;

  public static getInstance(): AccountingService {
    if (!AccountingService.instance) {
      AccountingService.instance = new AccountingService();
    }
    return AccountingService.instance;
  }

  /**
   * Process booking revenue and create ledger entries
   */
  async processBookingRevenue(booking: Booking): Promise<ApiResponse<FinancialTransaction>> {
    try {
      // Calculate revenue breakdown
      const breakdown = await this.calculateRevenueBreakdown(booking);
      
      // Create financial transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('financial_transactions')
        .insert([{
          type: 'BOOKING_REVENUE',
          amount: booking.total,
          currency: booking.currency,
          status: 'COMPLETED',
          description: `Booking revenue for ${booking.id}`,
          reference_type: 'BOOKING',
          reference_id: booking.id,
          processed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Create ledger entries
      const ledgerEntries: Omit<LedgerEntry, 'id' | 'created_at'>[] = [
        // Revenue recognition
        {
          transaction_id: transaction.id,
          account_type: 'REVENUE',
          account_name: 'Booking Revenue',
          credit_amount: breakdown.gross_revenue,
          description: `Booking revenue for ${booking.id}`,
          reference_type: 'BOOKING',
          reference_id: booking.id,
          entity_id: booking.owner_id,
          entity_type: 'OWNER',
        },
        // Platform commission
        {
          transaction_id: transaction.id,
          account_type: 'COMMISSION',
          account_name: 'Platform Commission',
          debit_amount: breakdown.platform_commission,
          description: `Platform commission for ${booking.id}`,
          reference_type: 'COMMISSION',
          reference_id: booking.id,
          entity_id: 'platform',
          entity_type: 'PLATFORM',
        },
        // Agent commission (if applicable)
        ...(booking.agent_id && breakdown.agent_commission > 0 ? [{
          transaction_id: transaction.id,
          account_type: 'COMMISSION',
          account_name: 'Agent Commission',
          debit_amount: breakdown.agent_commission,
          description: `Agent commission for ${booking.id}`,
          reference_type: 'COMMISSION',
          reference_id: booking.id,
          entity_id: booking.agent_id,
          entity_type: 'AGENT' as const,
        }] : []),
        // Tax liability
        {
          transaction_id: transaction.id,
          account_type: 'TAX',
          account_name: 'Tax Payable',
          credit_amount: breakdown.tax_amount,
          description: `Tax for ${booking.id}`,
          reference_type: 'TAX',
          reference_id: booking.id,
          entity_id: 'platform',
          entity_type: 'PLATFORM',
        },
        // Owner net revenue payable
        {
          transaction_id: transaction.id,
          account_type: 'PAYABLE',
          account_name: 'Owner Revenue Payable',
          credit_amount: breakdown.owner_net_revenue,
          description: `Net revenue payable to owner for ${booking.id}`,
          reference_type: 'BOOKING',
          reference_id: booking.id,
          entity_id: booking.owner_id,
          entity_type: 'OWNER',
        },
      ];

      // Insert ledger entries
      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .insert(ledgerEntries);

      if (ledgerError) throw ledgerError;

      return {
        success: true,
        data: transaction,
      };
    } catch (error: any) {
      console.error('Failed to process booking revenue:', error);
      return {
        success: false,
        error: error.message || 'Failed to process booking revenue',
        data: null,
      };
    }
  }

  /**
   * Calculate revenue breakdown based on commission structure
   */
  async calculateRevenueBreakdown(booking: Booking): Promise<RevenueBreakdown> {
    try {
      const grossRevenue = booking.total || 0;
      const taxAmount = booking.tax || 0;
      
      // Get commission structure
      const platformCommission = await this.calculatePlatformCommission(booking);
      const agentCommission = booking.agent_id ? await this.calculateAgentCommission(booking) : 0;
      
      const processingFees = 0; // Can be calculated based on payment method
      const ownerNetRevenue = grossRevenue - platformCommission - agentCommission - processingFees;

      return {
        gross_revenue: grossRevenue,
        platform_commission: platformCommission,
        agent_commission: agentCommission,
        owner_net_revenue: Math.max(0, ownerNetRevenue),
        tax_amount: taxAmount,
        processing_fees: processingFees,
      };
    } catch (error) {
      console.error('Failed to calculate revenue breakdown:', error);
      return {
        gross_revenue: booking.total || 0,
        platform_commission: 0,
        agent_commission: 0,
        owner_net_revenue: booking.total || 0,
        tax_amount: booking.tax || 0,
        processing_fees: 0,
      };
    }
  }

  /**
   * Calculate platform commission based on structure
   */
  private async calculatePlatformCommission(booking: Booking): Promise<number> {
    try {
      const { data: structure } = await supabase
        .from('commission_structures')
        .select('*')
        .eq('entity_type', 'PLATFORM')
        .eq('booking_channel', booking.channel)
        .eq('is_active', true)
        .lte('effective_from', new Date().toISOString())
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      if (!structure) {
        // Default platform commission: 5%
        return (booking.total || 0) * 0.05;
      }

      let commission = structure.commission_type === 'PERCENTAGE' 
        ? (booking.total || 0) * (structure.commission_rate / 100)
        : structure.commission_rate;

      // Apply min/max limits
      if (structure.minimum_amount && commission < structure.minimum_amount) {
        commission = structure.minimum_amount;
      }
      if (structure.maximum_amount && commission > structure.maximum_amount) {
        commission = structure.maximum_amount;
      }

      return commission;
    } catch (error) {
      console.error('Failed to calculate platform commission:', error);
      return (booking.total || 0) * 0.05; // Default 5%
    }
  }

  /**
   * Calculate agent commission based on structure
   */
  private async calculateAgentCommission(booking: Booking): Promise<number> {
    if (!booking.agent_id) return 0;

    try {
      // Try to get agent-specific commission structure first
      let { data: structure } = await supabase
        .from('commission_structures')
        .select('*')
        .eq('entity_type', 'AGENT')
        .eq('entity_id', booking.agent_id)
        .eq('booking_channel', booking.channel)
        .eq('is_active', true)
        .lte('effective_from', new Date().toISOString())
        .order('effective_from', { ascending: false })
        .limit(1)
        .single();

      // If no agent-specific structure, get default agent structure
      if (!structure) {
        const { data: defaultStructure } = await supabase
          .from('commission_structures')
          .select('*')
          .eq('entity_type', 'AGENT')
          .is('entity_id', null)
          .eq('booking_channel', booking.channel)
          .eq('is_active', true)
          .lte('effective_from', new Date().toISOString())
          .order('effective_from', { ascending: false })
          .limit(1)
          .single();

        structure = defaultStructure;
      }

      if (!structure) {
        // Default agent commission: 3%
        return (booking.total || 0) * 0.03;
      }

      let commission = structure.commission_type === 'PERCENTAGE' 
        ? (booking.total || 0) * (structure.commission_rate / 100)
        : structure.commission_rate;

      // Apply min/max limits
      if (structure.minimum_amount && commission < structure.minimum_amount) {
        commission = structure.minimum_amount;
      }
      if (structure.maximum_amount && commission > structure.maximum_amount) {
        commission = structure.maximum_amount;
      }

      return commission;
    } catch (error) {
      console.error('Failed to calculate agent commission:', error);
      return (booking.total || 0) * 0.03; // Default 3%
    }
  }

  /**
   * Get financial summary for a period
   */
  async getFinancialSummary(
    startDate: string,
    endDate: string,
    entityType?: 'OWNER' | 'AGENT',
    entityId?: string
  ): Promise<ApiResponse<FinancialSummary>> {
    try {
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          ledger_entries(*)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (entityType && entityId) {
        query = query.eq('entity_id', entityId).eq('entity_type', entityType);
      }

      const { data: transactions, error } = await query;
      if (error) throw error;

      // Calculate summary
      const summary: FinancialSummary = {
        period: `${startDate} to ${endDate}`,
        total_bookings: 0,
        gross_revenue: 0,
        net_revenue: 0,
        platform_commission: 0,
        agent_commission: 0,
        tax_collected: 0,
        outstanding_receivables: 0,
        outstanding_payables: 0,
      };

      transactions?.forEach(transaction => {
        if (transaction.type === 'BOOKING_REVENUE') {
          summary.total_bookings += 1;
          summary.gross_revenue += transaction.amount;
          
          transaction.ledger_entries?.forEach((entry: LedgerEntry) => {
            switch (entry.account_type) {
              case 'COMMISSION':
                if (entry.entity_type === 'PLATFORM') {
                  summary.platform_commission += entry.debit_amount || 0;
                } else if (entry.entity_type === 'AGENT') {
                  summary.agent_commission += entry.debit_amount || 0;
                }
                break;
              case 'TAX':
                summary.tax_collected += entry.credit_amount || 0;
                break;
              case 'PAYABLE':
                summary.outstanding_payables += entry.credit_amount || 0;
                break;
              case 'RECEIVABLE':
                summary.outstanding_receivables += entry.debit_amount || 0;
                break;
            }
          });
        }
      });

      summary.net_revenue = summary.gross_revenue - summary.platform_commission - summary.agent_commission;

      return {
        success: true,
        data: summary,
      };
    } catch (error: any) {
      console.error('Failed to get financial summary:', error);
      return {
        success: false,
        error: error.message || 'Failed to get financial summary',
        data: null,
      };
    }
  }

  /**
   * Get owner earnings for a period
   */
  async getOwnerEarnings(
    ownerId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<OwnerEarnings>> {
    try {
      // Get bookings for the period
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('owner_id', ownerId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('status', ['CONFIRMED', 'COMPLETED']);

      if (bookingsError) throw bookingsError;

      const earnings: OwnerEarnings = {
        owner_id: ownerId,
        period: `${startDate} to ${endDate}`,
        total_bookings: bookings?.length || 0,
        gross_revenue: 0,
        platform_commission: 0,
        agent_commission: 0,
        net_earnings: 0,
        tax_amount: 0,
        outstanding_amount: 0,
      };

      // Calculate earnings from bookings
      for (const booking of bookings || []) {
        const breakdown = await this.calculateRevenueBreakdown(booking);
        earnings.gross_revenue += breakdown.gross_revenue;
        earnings.platform_commission += breakdown.platform_commission;
        earnings.agent_commission += breakdown.agent_commission;
        earnings.net_earnings += breakdown.owner_net_revenue;
        earnings.tax_amount += breakdown.tax_amount;
      }

      // Get outstanding payments
      const { data: outstanding } = await supabase
        .from('ledger_entries')
        .select('credit_amount')
        .eq('entity_id', ownerId)
        .eq('entity_type', 'OWNER')
        .eq('account_type', 'PAYABLE')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      earnings.outstanding_amount = outstanding?.reduce((sum, entry) => 
        sum + (entry.credit_amount || 0), 0) || 0;

      return {
        success: true,
        data: earnings,
      };
    } catch (error: any) {
      console.error('Failed to get owner earnings:', error);
      return {
        success: false,
        error: error.message || 'Failed to get owner earnings',
        data: null,
      };
    }
  }

  /**
   * Get agent commissions for a period
   */
  async getAgentCommissions(
    agentId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<AgentCommissions>> {
    try {
      // Get agent bookings for the period
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('agent_id', agentId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('status', ['CONFIRMED', 'COMPLETED']);

      if (bookingsError) throw bookingsError;

      const commissions: AgentCommissions = {
        agent_id: agentId,
        period: `${startDate} to ${endDate}`,
        total_bookings: bookings?.length || 0,
        gross_commission: 0,
        platform_fee: 0,
        net_commission: 0,
        outstanding_amount: 0,
      };

      // Calculate commissions from bookings
      for (const booking of bookings || []) {
        const agentCommission = await this.calculateAgentCommission(booking);
        commissions.gross_commission += agentCommission;
        // Platform takes 10% of agent commission as processing fee
        const platformFee = agentCommission * 0.1;
        commissions.platform_fee += platformFee;
        commissions.net_commission += (agentCommission - platformFee);
      }

      // Get outstanding commission payments
      const { data: outstanding } = await supabase
        .from('ledger_entries')
        .select('debit_amount')
        .eq('entity_id', agentId)
        .eq('entity_type', 'AGENT')
        .eq('account_type', 'COMMISSION')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      commissions.outstanding_amount = outstanding?.reduce((sum, entry) => 
        sum + (entry.debit_amount || 0), 0) || 0;

      return {
        success: true,
        data: commissions,
      };
    } catch (error: any) {
      console.error('Failed to get agent commissions:', error);
      return {
        success: false,
        error: error.message || 'Failed to get agent commissions',
        data: null,
      };
    }
  }

  /**
   * Create commission structure
   */
  async createCommissionStructure(structure: Omit<CommissionStructure, 'id'>): Promise<ApiResponse<CommissionStructure>> {
    try {
      const { data, error } = await supabase
        .from('commission_structures')
        .insert([structure])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Failed to create commission structure:', error);
      return {
        success: false,
        error: error.message || 'Failed to create commission structure',
        data: null,
      };
    }
  }

  /**
   * Get ledger entries for an entity
   */
  async getLedgerEntries(
    entityType: 'OWNER' | 'AGENT' | 'PLATFORM',
    entityId: string,
    startDate?: string,
    endDate?: string,
    limit = 50
  ): Promise<ApiResponse<LedgerEntry[]>> {
    try {
      let query = supabase
        .from('ledger_entries')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Failed to get ledger entries:', error);
      return {
        success: false,
        error: error.message || 'Failed to get ledger entries',
        data: [],
      };
    }
  }
}

// Export singleton instance
export const accountingService = AccountingService.getInstance();
