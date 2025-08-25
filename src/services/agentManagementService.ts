import { supabase } from '../config/supabase';
import {
    AgentOwnerLink,
    ApiResponse,
    CreditTransaction,
    Owner
} from '../types';

export interface AgentConnectionRequest {
  agent_id: string;
  owner_id: string;
  message?: string;
  requested_credit_limit?: number;
}

export interface CreditAllocation {
  agent_id: string;
  owner_id: string;
  credit_limit: number;
  current_balance: number;
  interest_rate?: number;
  payment_terms_days?: number;
}

export interface AgentStats {
  total_connections: number;
  active_connections: number;
  total_credit_limit: number;
  available_credit: number;
  pending_requests: number;
  total_bookings_this_month: number;
}

export interface OwnerSearchResult extends Owner {
  connection_status?: 'connected' | 'pending' | 'not_connected';
  credit_balance?: number;
  credit_limit?: number;
  last_booking?: string;
}

export interface ConnectionWithStats extends AgentOwnerLink {
  owner: Owner;
  booking_count: number;
  last_booking_date?: string;
  outstanding_amount: number;
}

export class AgentManagementService {
  private static instance: AgentManagementService;

  public static getInstance(): AgentManagementService {
    if (!AgentManagementService.instance) {
      AgentManagementService.instance = new AgentManagementService();
    }
    return AgentManagementService.instance;
  }

  /**
   * Search for owners to connect with
   */
  async searchOwners(
    agentId: string,
    filters?: {
      location?: string;
      services?: string[];
      search?: string;
    }
  ): Promise<ApiResponse<OwnerSearchResult[]>> {
    try {
      let query = supabase
        .from('owners')
        .select(`
          *,
          agent_owner_links!left(
            agent_id,
            status,
            credit_limit,
            current_balance
          )
        `)
        .eq('is_active', true);

      // Apply search filter
      if (filters?.search) {
        query = query.or(`
          brand_name.ilike.%${filters.search}%,
          business_name.ilike.%${filters.search}%,
          description.ilike.%${filters.search}%
        `);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform data to include connection status
      const ownersWithStatus: OwnerSearchResult[] = (data || []).map(owner => {
        const connection = owner.agent_owner_links.find(
          (link: any) => link.agent_id === agentId
        );

        let connectionStatus: 'connected' | 'pending' | 'not_connected' = 'not_connected';
        if (connection) {
          connectionStatus = connection.status === 'ACTIVE' ? 'connected' : 'pending';
        }

        return {
          ...owner,
          connection_status: connectionStatus,
          credit_balance: connection?.current_balance || 0,
          credit_limit: connection?.credit_limit || 0,
        };
      });

      return {
        success: true,
        data: ownersWithStatus,
      };
    } catch (error: any) {
      console.error('Owner search failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to search owners',
        data: [],
      };
    }
  }

  /**
   * Send connection request to owner
   */
  async sendConnectionRequest(request: AgentConnectionRequest): Promise<ApiResponse<AgentOwnerLink>> {
    try {
      // Check if connection already exists
      const { data: existing } = await supabase
        .from('agent_owner_links')
        .select('id, status')
        .eq('agent_id', request.agent_id)
        .eq('owner_id', request.owner_id)
        .single();

      if (existing) {
        return {
          success: false,
          error: existing.status === 'ACTIVE' 
            ? 'Already connected to this owner'
            : 'Connection request already sent',
          data: null,
        };
      }

      // Create new connection request
      const { data, error } = await supabase
        .from('agent_owner_links')
        .insert([{
          agent_id: request.agent_id,
          owner_id: request.owner_id,
          status: 'PENDING',
          requested_credit_limit: request.requested_credit_limit || 0,
          message: request.message,
          credit_limit: 0,
          current_balance: 0,
        }])
        .select()
        .single();

      if (error) throw error;

      // Send notification to owner (optional)
      // await notificationService.sendConnectionRequest(request);

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Connection request failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send connection request',
        data: null,
      };
    }
  }

  /**
   * Get agent's connections with owners
   */
  async getAgentConnections(agentId: string): Promise<ApiResponse<ConnectionWithStats[]>> {
    try {
      const { data, error } = await supabase
        .from('agent_owner_links')
        .select(`
          *,
          owner:owners(
            id,
            brand_name,
            business_name,
            logo_url,
            phone,
            email
          )
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get booking statistics for each connection
      const connectionsWithStats: ConnectionWithStats[] = [];

      for (const connection of data || []) {
        // Get booking count and last booking
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, created_at, total')
          .eq('agent_id', agentId)
          .eq('owner_id', connection.owner_id)
          .order('created_at', { ascending: false });

        const bookingCount = bookings?.length || 0;
        const lastBookingDate = bookings?.[0]?.created_at;
        
        // Calculate outstanding amount (simplified)
        const outstandingAmount = Math.max(0, (connection.credit_limit || 0) - (connection.current_balance || 0));

        connectionsWithStats.push({
          ...connection,
          booking_count: bookingCount,
          last_booking_date: lastBookingDate,
          outstanding_amount: outstandingAmount,
        });
      }

      return {
        success: true,
        data: connectionsWithStats,
      };
    } catch (error: any) {
      console.error('Failed to get agent connections:', error);
      return {
        success: false,
        error: error.message || 'Failed to get connections',
        data: [],
      };
    }
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(agentId: string): Promise<AgentStats> {
    try {
      // Get connections
      const { data: connections } = await supabase
        .from('agent_owner_links')
        .select('status, credit_limit, current_balance')
        .eq('agent_id', agentId);

      // Get this month's bookings
      const thisMonth = new Date();
      const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      
      const { data: monthlyBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('agent_id', agentId)
        .gte('created_at', startOfMonth.toISOString());

      const totalConnections = connections?.length || 0;
      const activeConnections = connections?.filter(c => c.status === 'ACTIVE').length || 0;
      const pendingRequests = connections?.filter(c => c.status === 'PENDING').length || 0;
      
      const totalCreditLimit = connections?.reduce((sum, c) => sum + (c.credit_limit || 0), 0) || 0;
      const availableCredit = connections?.reduce((sum, c) => sum + (c.current_balance || 0), 0) || 0;

      return {
        total_connections: totalConnections,
        active_connections: activeConnections,
        total_credit_limit: totalCreditLimit,
        available_credit: availableCredit,
        pending_requests: pendingRequests,
        total_bookings_this_month: monthlyBookings?.length || 0,
      };
    } catch (error) {
      console.error('Failed to get agent stats:', error);
      return {
        total_connections: 0,
        active_connections: 0,
        total_credit_limit: 0,
        available_credit: 0,
        pending_requests: 0,
        total_bookings_this_month: 0,
      };
    }
  }

  /**
   * Check available credit for booking
   */
  async checkAvailableCredit(
    agentId: string, 
    ownerId: string, 
    amount: number
  ): Promise<{ canAfford: boolean; availableCredit: number; creditLimit: number }> {
    try {
      const { data: connection } = await supabase
        .from('agent_owner_links')
        .select('credit_limit, current_balance')
        .eq('agent_id', agentId)
        .eq('owner_id', ownerId)
        .eq('status', 'ACTIVE')
        .single();

      if (!connection) {
        return {
          canAfford: false,
          availableCredit: 0,
          creditLimit: 0,
        };
      }

      const availableCredit = connection.current_balance || 0;
      const creditLimit = connection.credit_limit || 0;
      const canAfford = availableCredit >= amount;

      return {
        canAfford,
        availableCredit,
        creditLimit,
      };
    } catch (error) {
      console.error('Credit check failed:', error);
      return {
        canAfford: false,
        availableCredit: 0,
        creditLimit: 0,
      };
    }
  }

  /**
   * Deduct credit for booking
   */
  async deductCredit(
    agentId: string,
    ownerId: string,
    amount: number,
    bookingId: string,
    description: string
  ): Promise<ApiResponse<boolean>> {
    try {
      // Start transaction
      const { data: connection } = await supabase
        .from('agent_owner_links')
        .select('current_balance')
        .eq('agent_id', agentId)
        .eq('owner_id', ownerId)
        .eq('status', 'ACTIVE')
        .single();

      if (!connection) {
        return {
          success: false,
          error: 'No active connection found',
          data: false,
        };
      }

      const newBalance = (connection.current_balance || 0) - amount;

      if (newBalance < 0) {
        return {
          success: false,
          error: 'Insufficient credit balance',
          data: false,
        };
      }

      // Update balance
      const { error: updateError } = await supabase
        .from('agent_owner_links')
        .update({ current_balance: newBalance })
        .eq('agent_id', agentId)
        .eq('owner_id', ownerId);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert([{
          agent_id: agentId,
          owner_id: ownerId,
          type: 'DEBIT',
          amount: amount,
          balance_after: newBalance,
          reference_id: bookingId,
          reference_type: 'BOOKING',
          description: description,
        }]);

      if (transactionError) throw transactionError;

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      console.error('Credit deduction failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to deduct credit',
        data: false,
      };
    }
  }

  /**
   * Get credit transaction history
   */
  async getCreditHistory(
    agentId: string,
    ownerId?: string,
    limit = 50
  ): Promise<ApiResponse<CreditTransaction[]>> {
    try {
      let query = supabase
        .from('credit_transactions')
        .select(`
          *,
          owner:owners(brand_name, business_name)
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Failed to get credit history:', error);
      return {
        success: false,
        error: error.message || 'Failed to get credit history',
        data: [],
      };
    }
  }

  /**
   * Get pending connection requests (for owners)
   */
  async getPendingRequests(ownerId: string): Promise<ApiResponse<AgentOwnerLink[]>> {
    try {
      const { data, error } = await supabase
        .from('agent_owner_links')
        .select(`
          *,
          agent:agents(
            id,
            business_name,
            contact_person,
            phone,
            email,
            location
          )
        `)
        .eq('owner_id', ownerId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Failed to get pending requests:', error);
      return {
        success: false,
        error: error.message || 'Failed to get pending requests',
        data: [],
      };
    }
  }

  /**
   * Approve or reject connection request (for owners)
   */
  async respondToConnectionRequest(
    linkId: string,
    action: 'approve' | 'reject',
    creditLimit?: number
  ): Promise<ApiResponse<AgentOwnerLink>> {
    try {
      const updateData: any = {
        status: action === 'approve' ? 'ACTIVE' : 'REJECTED',
        updated_at: new Date().toISOString(),
      };

      if (action === 'approve' && creditLimit !== undefined) {
        updateData.credit_limit = creditLimit;
        updateData.current_balance = creditLimit; // Start with full credit
      }

      const { data, error } = await supabase
        .from('agent_owner_links')
        .update(updateData)
        .eq('id', linkId)
        .select()
        .single();

      if (error) throw error;

      // If approved, create initial credit transaction
      if (action === 'approve' && creditLimit && creditLimit > 0) {
        await supabase
          .from('credit_transactions')
          .insert([{
            agent_id: data.agent_id,
            owner_id: data.owner_id,
            type: 'CREDIT',
            amount: creditLimit,
            balance_after: creditLimit,
            reference_type: 'CREDIT_ALLOCATION',
            description: 'Initial credit allocation',
          }]);
      }

      // Send notification to agent
      // await notificationService.sendConnectionResponse(data, action);

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Connection response failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to respond to connection request',
        data: null,
      };
    }
  }

  /**
   * Update credit limit for existing connection
   */
  async updateCreditLimit(
    linkId: string,
    newCreditLimit: number,
    reason?: string
  ): Promise<ApiResponse<boolean>> {
    try {
      // Get current connection
      const { data: connection } = await supabase
        .from('agent_owner_links')
        .select('*')
        .eq('id', linkId)
        .single();

      if (!connection) {
        return {
          success: false,
          error: 'Connection not found',
          data: false,
        };
      }

      const oldLimit = connection.credit_limit || 0;
      const currentBalance = connection.current_balance || 0;
      const difference = newCreditLimit - oldLimit;

      // Update credit limit and adjust balance
      const newBalance = currentBalance + difference;

      const { error } = await supabase
        .from('agent_owner_links')
        .update({
          credit_limit: newCreditLimit,
          current_balance: Math.max(0, newBalance), // Ensure non-negative
          updated_at: new Date().toISOString(),
        })
        .eq('id', linkId);

      if (error) throw error;

      // Record transaction if there's a change
      if (difference !== 0) {
        await supabase
          .from('credit_transactions')
          .insert([{
            agent_id: connection.agent_id,
            owner_id: connection.owner_id,
            type: difference > 0 ? 'CREDIT' : 'DEBIT',
            amount: Math.abs(difference),
            balance_after: Math.max(0, newBalance),
            reference_type: 'CREDIT_ADJUSTMENT',
            description: reason || `Credit limit ${difference > 0 ? 'increased' : 'decreased'} by ${Math.abs(difference)}`,
          }]);
      }

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      console.error('Credit limit update failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update credit limit',
        data: false,
      };
    }
  }
}

// Export singleton instance
export const agentManagementService = AgentManagementService.getInstance();
