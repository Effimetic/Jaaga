import { supabase } from '../config/supabase';
import {
    AgentBookingRequest,
    AgentOwnerLink,
    ApiResponse,
    Boat,
    Booking,
    BookingRequest,
    PricingBreakdown,
    Schedule,
    SearchFilters,
    SearchResult,
    Ticket
} from '../types';
import { accountingService } from './accountingService';
import { agentManagementService } from './agentManagementService';
import { qrCodeService } from './qrCodeService';

export class ApiService {
  private static instance: ApiService;

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // SEARCH & BOOKING APIs

  /**
   * Search for available trips
   */
  async searchTrips(filters: SearchFilters): Promise<ApiResponse<SearchResult[]>> {
    try {
      let query = supabase
        .from('schedules')
        .select(`
          *,
          boat:boats(*),
          owner:owners(*),
          schedule_ticket_types(
            *,
            ticket_type:ticket_types(*)
          )
        `)
        .eq('status', 'ACTIVE');

      // Apply filters
      if (filters.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte('start_at', startOfDay.toISOString())
          .lt('start_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process results to calculate availability and pricing
      const searchResults: SearchResult[] = [];
      
      for (const schedule of data || []) {
        // Calculate available seats
        const { data: bookings } = await supabase
          .from('bookings')
          .select('seat_count, seats')
          .eq('schedule_id', schedule.id)
          .in('status', ['RESERVED', 'CONFIRMED']);

        let occupiedSeats = 0;
        if (bookings) {
          occupiedSeats = bookings.reduce((total, booking) => {
            return total + (booking.seat_count || booking.seats?.length || 0);
          }, 0);
        }

        const availableSeats = schedule.boat.capacity - occupiedSeats;

        if (availableSeats > 0) {
          // Calculate pricing
          const pricing = await this.calculatePricing(
            schedule.id,
            filters.passenger_count || 1
          );

          searchResults.push({
            schedule: {
              ...schedule,
              available_tickets: schedule.schedule_ticket_types,
              available_seats: availableSeats,
            },
            pricing,
          });
        }
      }

      // Apply price filter
      let filteredResults = searchResults;
      if (filters.max_price) {
        filteredResults = searchResults.filter(
          result => result.pricing.total <= filters.max_price!
        );
      }

      // Sort by departure time
      filteredResults.sort((a, b) => 
        new Date(a.schedule.start_at).getTime() - new Date(b.schedule.start_at).getTime()
      );

      return {
        success: true,
        data: filteredResults,
      };
    } catch (error: any) {
      console.error('Error searching trips:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate pricing for a schedule
   */
  async calculatePricing(
    scheduleId: string, 
    passengerCount: number = 1
  ): Promise<PricingBreakdown> {
    try {
      const { data: schedule } = await supabase
        .from('schedules')
        .select(`
          *,
          schedule_ticket_types(
            *,
            ticket_type:ticket_types(*)
          )
        `)
        .eq('id', scheduleId)
        .single();

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Get the default ticket type (first active one)
      const defaultTicketType = schedule.schedule_ticket_types.find(
        (stt: any) => stt.active
      );

      if (!defaultTicketType) {
        throw new Error('No active ticket types found');
      }

      const basePrice = defaultTicketType.price_override || defaultTicketType.ticket_type.base_price;
      const subtotal = basePrice * passengerCount;

      // Calculate tax (simplified - using 10% as example)
      const taxRate = 0.10; // 10% tax
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      return {
        subtotal,
        tax,
        total,
        currency: defaultTicketType.ticket_type.currency,
        items: [
          {
            ticket_type_id: defaultTicketType.ticket_type.id,
            quantity: passengerCount,
            unit_price: basePrice,
            tax: tax,
            total: total,
          },
        ],
      };
    } catch (error: any) {
      console.error('Error calculating pricing:', error);
      // Return default pricing structure
      return {
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'MVR',
        items: [],
      };
    }
  }

  /**
   * Create a booking
   */
  async createBooking(request: BookingRequest): Promise<ApiResponse<Booking>> {
    try {
      // Calculate pricing
      const pricing = await this.calculatePricing(
        request.scheduleId, 
        request.passengers.length
      );

      // Get schedule details
      const { data: schedule } = await supabase
        .from('schedules')
        .select('owner_id')
        .eq('id', request.scheduleId)
        .single();

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Create booking
      const bookingData = {
        created_by_role: 'PUBLIC' as const,
        creator_id: '', // Will be set by the auth context
        owner_id: schedule.owner_id,
        schedule_id: request.scheduleId,
        segment_key: request.segmentKey,
        seat_mode: request.seats ? 'SEATMAP' as const : 'CAPACITY' as const,
        seats: request.seats || [],
        seat_count: request.seatCount || request.passengers.length,
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        total: pricing.total,
        currency: pricing.currency,
        channel: 'WEB' as const,
        status: 'PENDING' as const,
        payment_status: 'UNPAID' as const,
        pay_method: request.paymentMethod,
        hold_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes hold
      };

      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error creating booking:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create an agent booking with credit deduction
   */
  async createAgentBooking(request: AgentBookingRequest): Promise<ApiResponse<Booking>> {
    try {
      // Calculate pricing
      const pricing = await this.calculatePricing(
        request.scheduleId, 
        request.passengers.length
      );

      // Check credit availability if using credit
      if (request.useCredit) {
        const creditCheck = await agentManagementService.checkAvailableCredit(
          request.agentId,
          request.ownerId,
          pricing.total
        );

        if (!creditCheck.canAfford) {
          return {
            success: false,
            error: `Insufficient credit. Available: MVR ${creditCheck.availableCredit.toFixed(2)}, Required: MVR ${pricing.total.toFixed(2)}`,
            data: null,
          };
        }
      }

      // Get schedule details
      const { data: schedule } = await supabase
        .from('schedules')
        .select('owner_id')
        .eq('id', request.scheduleId)
        .single();

      if (!schedule) {
        throw new Error('Schedule not found');
      }

      // Create booking with agent information
      const bookingData = {
        created_by_role: 'AGENT' as const,
        creator_id: request.agentId,
        agent_id: request.agentId,
        owner_id: schedule.owner_id,
        schedule_id: request.scheduleId,
        segment_key: request.segmentKey,
        seat_mode: request.seats ? 'SEATMAP' as const : 'CAPACITY' as const,
        seats: request.seats || [],
        seat_count: request.seatCount || request.passengers.length,
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        total: pricing.total,
        currency: pricing.currency,
        channel: 'AGENT' as const,
        status: request.useCredit ? 'CONFIRMED' as const : 'PENDING' as const,
        payment_status: request.useCredit ? 'PAID' as const : 'UNPAID' as const,
        pay_method: request.useCredit ? 'CREDIT' as const : request.paymentMethod,
        hold_expires_at: request.useCredit ? null : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      const { data: booking, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;

      // Deduct credit if using credit payment
      if (request.useCredit) {
        const creditResult = await agentManagementService.deductCredit(
          request.agentId,
          request.ownerId,
          pricing.total,
          booking.id,
          `Booking for ${request.passengers.length} passenger(s) - ${request.segmentKey}`
        );

        if (!creditResult.success) {
          // Rollback booking if credit deduction fails
          await supabase
            .from('bookings')
            .delete()
            .eq('id', booking.id);

          return {
            success: false,
            error: creditResult.error || 'Failed to deduct credit',
            data: null,
          };
        }

        // Process revenue for confirmed credit bookings
        if (request.useCredit) {
          try {
            await accountingService.processBookingRevenue(booking);
          } catch (accountingError) {
            console.error('Failed to process agent booking revenue:', accountingError);
            // Don't fail the booking for accounting errors
          }
        }
      }

      return {
        success: true,
        data: booking,
      };
    } catch (error: any) {
      console.error('Error creating agent booking:', error);
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          schedule:schedules(
            *,
            boat:boats(*)
          ),
          booking_items(*),
          tickets(*)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error getting booking:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Confirm booking and issue tickets
   */
  async confirmBooking(bookingId: string): Promise<ApiResponse<Ticket[]>> {
    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'CONFIRMED',
          payment_status: 'PAID',
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      // Get booking details to create tickets
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          *,
          schedule:schedules(
            *,
            schedule_ticket_types(
              *,
              ticket_type:ticket_types(*)
            )
          )
        `)
        .eq('id', bookingId)
        .single();

      if (!booking) throw new Error('Booking not found');

      // Create tickets
      const tickets = [];
      const ticketType = booking.schedule.schedule_ticket_types[0]; // Use first active ticket type

      for (let i = 0; i < booking.seat_count; i++) {
        // First create the ticket without QR code to get the ID
        const ticketData = {
          booking_id: bookingId,
          passenger_name: `Passenger ${i + 1}`, // This should come from passenger info
          ticket_type_id: ticketType.ticket_type.id,
          seat_id: booking.seats[i] || null,
          qr_code: 'temp', // Temporary placeholder
          status: 'ISSUED' as const,
        };

        const { data: ticket, error } = await supabase
          .from('tickets')
          .insert([ticketData])
          .select()
          .single();

        if (error) throw error;

        // Generate QR code with the actual ticket ID
        const qrCode = await qrCodeService.generateQRCode({
          ticket_id: ticket.id,
          booking_id: bookingId,
          owner_id: booking.owner_id,
          schedule_id: booking.schedule_id,
          segment_key: booking.segment_key,
          seat_id: booking.seats[i] || undefined,
        });

        // Update the ticket with the real QR code
        const { data: updatedTicket, error: updateError } = await supabase
          .from('tickets')
          .update({ qr_code: qrCode })
          .eq('id', ticket.id)
          .select()
          .single();

        if (updateError) throw updateError;
        
        tickets.push(updatedTicket);
      }

      // Process revenue and create accounting entries
      try {
        await accountingService.processBookingRevenue(booking);
      } catch (accountingError) {
        console.error('Failed to process booking revenue:', accountingError);
        // Don't fail the booking confirmation for accounting errors
        // This can be retried later
      }

      return {
        success: true,
        data: tickets,
      };
    } catch (error: any) {
      console.error('Error confirming booking:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // USER BOOKINGS & TICKETS APIs

  /**
   * Get user's bookings
   */
  async getUserBookings(userId: string): Promise<ApiResponse<Booking[]>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          schedule:schedules(
            *,
            boat:boats(*)
          ),
          tickets(*)
        `)
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Error getting user bookings:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId: string): Promise<ApiResponse<Ticket[]>> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          booking:bookings(
            *,
            schedule:schedules(
              *,
              boat:boats(*)
            )
          ),
          ticket_type:ticket_types(*)
        `)
        .eq('booking.creator_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Error getting user tickets:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // AGENT APIs

  /**
   * Get agent connections
   */
  async getAgentConnections(agentId: string): Promise<ApiResponse<AgentOwnerLink[]>> {
    try {
      const { data, error } = await supabase
        .from('agent_owner_links')
        .select(`
          *,
          owner:owners(*)
        `)
        .eq('agent_id', agentId);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Error getting agent connections:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Request agent connection
   */
  async requestAgentConnection(
    agentId: string, 
    ownerId: string
  ): Promise<ApiResponse<AgentOwnerLink>> {
    try {
      const connectionData = {
        agent_id: agentId,
        owner_id: ownerId,
        status: 'REQUESTED' as const,
        active: false,
        credit_limit: 0,
        credit_currency: 'MVR',
        settlement_currency: 'MVR',
        payment_terms_days: 30,
        allowed_payment_methods: [],
        allowed_ticket_type_ids: [],
      };

      const { data, error } = await supabase
        .from('agent_owner_links')
        .insert([connectionData])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error requesting agent connection:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // BOAT MANAGEMENT APIs

  /**
   * Get owner's boats
   */
  async getOwnerBoats(ownerId: string): Promise<ApiResponse<Boat[]>> {
    try {
      const { data, error } = await supabase
        .from('boats')
        .select('*')
        .eq('owner_id', ownerId);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Error getting owner boats:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Create new boat
   */
  async createBoat(boatData: Omit<Boat, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Boat>> {
    try {
      const { data, error } = await supabase
        .from('boats')
        .insert([boatData])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error creating boat:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // SCHEDULE MANAGEMENT APIs

  /**
   * Get owner's schedules
   */
  async getOwnerSchedules(ownerId: string): Promise<ApiResponse<Schedule[]>> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          boat:boats(*),
          schedule_ticket_types(
            *,
            ticket_type:ticket_types(*)
          )
        `)
        .eq('owner_id', ownerId)
        .order('start_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Error getting owner schedules:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // UTILITY METHODS

  /**
   * Check if user has permission to access resource
   */
  async checkPermission(userId: string, resourceId: string, action: string): Promise<boolean> {
    // This would contain permission checking logic
    // For now, return true (implement based on business rules)
    return true;
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();
