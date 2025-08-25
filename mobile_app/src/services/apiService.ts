import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { userService } from './userService';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = 'http://localhost:5001/api';
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await userService.getAuthToken();
        console.log('🔄 API Request Interceptor: Token found:', !!token, 'URL:', config.url);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔄 API Request Interceptor: Authorization header set');
        } else {
          console.log('🔄 API Request Interceptor: No token found');
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid, clear session
          await userService.clearCurrentUserSession();
          // You might want to redirect to login here
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async sendSMS(phone: string): Promise<any> {
    try {
      const response = await this.api.post('/auth/send-sms', { phone });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to send SMS');
    }
  }

  async verifyToken(phone: string, token: string): Promise<any> {
    try {
      const response = await this.api.post('/auth/verify-sms', { phone, code: token });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to verify token');
    }
  }

  async getProfile(): Promise<any> {
    try {
      console.log('🔍 ApiService: Calling getProfile endpoint...');
      const response = await this.api.get('/user/profile');
      console.log('🔍 ApiService: Profile response received:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('🔍 ApiService: Profile API error:', error);
      console.error('🔍 ApiService: Error response:', error.response?.data);
      throw new Error(error.response?.data?.error || 'Failed to get profile');
    }
  }

  async logout(): Promise<any> {
    try {
      const response = await this.api.post('/auth/logout');
      return response.data;
    } catch (error: any) {
      // Don't throw error for logout - continue with local logout
      console.log('API logout failed:', error.response?.data?.error || 'Failed to logout');
      return { success: false };
    }
  }

  // Search schedules (public endpoint)
  async searchSchedules(params: {
    from?: string;
    to?: string;
    date?: string;
    passengers?: number;
  }): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/schedules/search`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to search schedules');
    }
  }

  // Schedule endpoints
  async getSchedules(params?: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    try {
      const response = await this.api.get('/schedules', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get schedules');
    }
  }

  async getAgentSchedules(): Promise<any> {
    try {
      const response = await this.api.get('/bookings/agent-schedules');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get agent schedules');
    }
  }

  async getAgentOwners(): Promise<any> {
    try {
      const response = await this.api.get('/bookings/agent-owners');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get connected owners');
    }
  }

  async getScheduleById(scheduleId: number): Promise<any> {
    try {
      const response = await this.api.get(`/schedules/schedules/${scheduleId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get schedule');
    }
  }

  async createSchedule(scheduleData: any): Promise<any> {
    try {
      const response = await this.api.post('/schedules/schedules/create', scheduleData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create schedule');
    }
  }

  async updateSchedule(scheduleId: number, scheduleData: any): Promise<any> {
    try {
      const response = await this.api.put(`/schedules/schedules/${scheduleId}`, scheduleData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update schedule');
    }
  }

  async deleteSchedule(scheduleId: number): Promise<any> {
    try {
      const response = await this.api.delete(`/schedules/schedules/${scheduleId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete schedule');
    }
  }

  // Boat management endpoints
  async getBoats(): Promise<any> {
    try {
      const response = await this.api.get('/boats/boats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get boats');
    }
  }

  async getBoatById(boatId: number): Promise<any> {
    try {
      const response = await this.api.get(`/boats/boats/${boatId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get boat');
    }
  }

  async createBoat(boatData: any): Promise<any> {
    try {
      const response = await this.api.post('/boats/boats/add', boatData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create boat');
    }
  }

  async getScheduleBookings(scheduleId: number): Promise<any> {
    try {
      const response = await this.api.get(`/schedules/schedules/${scheduleId}/bookings`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get schedule bookings');
    }
  }

  async updateBoat(boatId: number, boatData: any): Promise<any> {
    try {
      const response = await this.api.put(`/boats/boats/${boatId}/edit`, boatData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update boat');
    }
  }

  async deleteBoat(boatId: number): Promise<any> {
    try {
      const response = await this.api.post(`/boats/boats/${boatId}/delete`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete boat');
    }
  }

  // Booking endpoints
  async getBookings(params?: any): Promise<any> {
    try {
      const response = await this.api.get('/bookings/bookings', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get bookings');
    }
  }

  async createBooking(scheduleId: number, bookingData: any): Promise<any> {
    try {
      const response = await this.api.post(`/bookings/schedules/${scheduleId}/bookings`, bookingData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create booking');
    }
  }

  async getBookingById(bookingId: number): Promise<any> {
    try {
      const response = await this.api.get(`/bookings/bookings/${bookingId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get booking');
    }
  }

  async getBookingByCode(code: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/bookings/code/${code}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get booking');
    }
  }

  // Owner settings endpoints
  async getOwnerSettings(): Promise<any> {
    try {
      const response = await this.api.get('/owner-settings/settings');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get owner settings');
    }
  }

  async updateOwnerSettings(settingsData: any): Promise<any> {
    try {
      const response = await this.api.put('/owner-settings/settings', settingsData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update owner settings');
    }
  }

  async getPaymentMethods(): Promise<any> {
    try {
      const response = await this.api.get('/owner-settings/settings/payment-methods');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get payment methods');
    }
  }

  async updatePaymentMethods(paymentData: any): Promise<any> {
    try {
      const response = await this.api.post('/owner-settings/settings/payment-methods', paymentData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update payment methods');
    }
  }

  async getTaxConfigurations(): Promise<any> {
    try {
      const response = await this.api.get('/owner-settings/settings/tax-configurations');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get tax configurations');
    }
  }

  async getAgents(): Promise<any> {
    try {
      const response = await this.api.get('/bookings/owner-agents');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get agents');
    }
  }

  // Get schedule ticket types
  async getScheduleTicketTypes(scheduleId: number): Promise<any> {
    try {
      const response = await this.api.get(`/schedules/schedules/${scheduleId}/ticket-types`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get schedule ticket types');
    }
  }

  // Owner settings endpoints
  async getTicketTypes(): Promise<any> {
    try {
      const response = await this.api.get('/bookings/ticket-types');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get ticket types');
    }
  }

  async createTicketType(ticketTypeData: any): Promise<any> {
    try {
      const response = await this.api.post('/owner-settings/settings/ticket-types', { 
        action: 'create', 
        ...ticketTypeData 
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create ticket type');
    }
  }

  async updateTicketType(ticketTypeId: number, ticketTypeData: any): Promise<any> {
    try {
      const response = await this.api.post('/owner-settings/settings/ticket-types', { 
        action: 'update', 
        id: ticketTypeId,
        ...ticketTypeData 
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update ticket type');
    }
  }

  async deleteTicketType(ticketTypeId: number): Promise<any> {
    try {
      const response = await this.api.post('/owner-settings/settings/ticket-types', { 
        action: 'delete', 
        id: ticketTypeId 
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete ticket type');
    }
  }

  // Islands and destinations
  async getIslands(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/schedules/api/islands`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get islands');
    }
  }

  async getDestinations(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/schedules/api/destinations`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get destinations');
    }
  }

  // Registration endpoint
  async register(userData: any): Promise<any> {
    try {
      const response = await axios.post(`${this.baseURL}/register`, userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  // Agent connection endpoints
  async getAgentConnections(): Promise<any> {
    try {
      const response = await this.api.get('/agent/connections');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get agent connections');
    }
  }

  async requestAgentConnection(requestData: any): Promise<any> {
    try {
      const response = await this.api.post('/agent/request-connection', requestData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to request connection');
    }
  }

  async searchOwnerByPhone(phone: string): Promise<any> {
    try {
      const response = await this.api.get(`/agent/search-owner?phone=${phone}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to search owner');
    }
  }

  async getAgentBookings(params?: any): Promise<any> {
    try {
      const response = await this.api.get('/agent/bookings', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get agent bookings');
    }
  }

  async getAgentAccountBook(): Promise<any> {
    try {
      const response = await this.api.get('/agent/account-book');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get agent account book');
    }
  }

  async exportAgentAccountBook(ownerId: number, format: 'CSV' | 'PDF'): Promise<any> {
    try {
      const response = await this.api.get(`/agent/account-book/${ownerId}/export?format=${format}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export account book');
    }
  }

  // Owner agent management endpoints
  async getOwnerAgentConnections(): Promise<any> {
    try {
      const response = await this.api.get('/owner/agent-connections');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get agent connections');
    }
  }

  async getPendingAgentRequests(): Promise<any> {
    try {
      const response = await this.api.get('/owner/agent-requests/pending');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get pending requests');
    }
  }

  async respondToAgentRequest(requestId: number, action: 'APPROVE' | 'REJECT'): Promise<any> {
    try {
      const response = await this.api.post(`/owner/agent-requests/${requestId}/${action.toLowerCase()}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || `Failed to ${action.toLowerCase()} request`);
    }
  }

  async updateAgentConnection(connectionId: number, updateData: any): Promise<any> {
    try {
      const response = await this.api.put(`/owner/agent-connections/${connectionId}`, updateData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update connection');
    }
  }

  async blockAgentConnection(connectionId: number): Promise<any> {
    try {
      const response = await this.api.post(`/owner/agent-connections/${connectionId}/block`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to block connection');
    }
  }

  // Owner account book endpoints
  async getOwnerAccountSummary(): Promise<any> {
    try {
      const response = await this.api.get('/owner/account-book/summary');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get account summary');
    }
  }

  async getOwnerAccountEntries(params?: any): Promise<any> {
    try {
      const response = await this.api.get('/owner/account-book/entries', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get account entries');
    }
  }

  async exportOwnerAccountBook(format: 'CSV' | 'PDF', filters?: any): Promise<any> {
    try {
      const response = await this.api.get(`/owner/account-book/export?format=${format}`, { params: filters });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to export account book');
    }
  }

  async initiateAppFeeSettlement(): Promise<any> {
    try {
      const response = await this.api.post('/owner/app-fee-settlement');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to initiate settlement');
    }
  }

  // Ticket management endpoints
  async getMyTickets(params?: any): Promise<any> {
    try {
      const response = await this.api.get('/tickets/my-tickets', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get tickets');
    }
  }

  async resendTicket(ticketId: number): Promise<any> {
    try {
      const response = await this.api.post(`/tickets/${ticketId}/resend`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to resend ticket');
    }
  }

  async cancelTicket(ticketId: number, reason?: string): Promise<any> {
    try {
      const response = await this.api.post(`/tickets/${ticketId}/cancel`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to cancel ticket');
    }
  }

  // Seat map endpoints
  async getScheduleSeatMap(scheduleId: number): Promise<any> {
    try {
      const response = await this.api.get(`/schedules/${scheduleId}/seat-map`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get seat map');
    }
  }

  async reserveSeats(scheduleId: number, seatIds: number[]): Promise<any> {
    try {
      const response = await this.api.post(`/schedules/${scheduleId}/reserve-seats`, { seat_ids: seatIds });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to reserve seats');
    }
  }

  async releaseSeats(scheduleId: number, seatIds: number[]): Promise<any> {
    try {
      const response = await this.api.post(`/schedules/${scheduleId}/release-seats`, { seat_ids: seatIds });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to release seats');
    }
  }

  // Dashboard stats endpoint
  async getDashboardStats(): Promise<any> {
    try {
      const response = await this.api.get('/dashboard');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get dashboard stats');
    }
  }


}

export const apiService = new ApiService();
export default apiService;
