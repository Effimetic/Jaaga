import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { userService } from './userService';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = 'http://192.168.100.14:8081';
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
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
      const response = await this.api.post('/login', { phone });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to send SMS');
    }
  }

  async verifyToken(phone: string, token: string): Promise<any> {
    try {
      const response = await this.api.post('/verify_token', { phone, token });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to verify token');
    }
  }

  async getProfile(): Promise<any> {
    try {
      const response = await this.api.get('/api/auth/profile');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get profile');
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
      const response = await this.api.get('/schedules/list', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get schedules');
    }
  }

  async getScheduleById(scheduleId: number): Promise<any> {
    try {
      const response = await this.api.get(`/schedules/${scheduleId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get schedule');
    }
  }

  async createSchedule(scheduleData: any): Promise<any> {
    try {
      const response = await this.api.post('/schedules/create', scheduleData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create schedule');
    }
  }

  async updateSchedule(scheduleId: number, scheduleData: any): Promise<any> {
    try {
      const response = await this.api.put(`/schedules/${scheduleId}`, scheduleData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update schedule');
    }
  }

  async deleteSchedule(scheduleId: number): Promise<any> {
    try {
      const response = await this.api.delete(`/schedules/${scheduleId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete schedule');
    }
  }

  // Boat management endpoints
  async getBoats(): Promise<any> {
    try {
      const response = await this.api.get('/boats/');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get boats');
    }
  }

  async getBoatById(boatId: number): Promise<any> {
    try {
      const response = await this.api.get(`/boats/${boatId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get boat');
    }
  }

  async createBoat(boatData: any): Promise<any> {
    try {
      const response = await this.api.post('/boats/create', boatData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create boat');
    }
  }

  async updateBoat(boatId: number, boatData: any): Promise<any> {
    try {
      const response = await this.api.put(`/boats/${boatId}`, boatData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update boat');
    }
  }

  async deleteBoat(boatId: number): Promise<any> {
    try {
      const response = await this.api.delete(`/boats/${boatId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete boat');
    }
  }

  // Booking endpoints
  async getBookings(scheduleId?: number): Promise<any> {
    try {
      const endpoint = scheduleId 
        ? `/api/schedules/${scheduleId}/bookings`
        : '/api/bookings';
      const response = await this.api.get(endpoint);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get bookings');
    }
  }

  async createBooking(scheduleId: number, bookingData: any): Promise<any> {
    try {
      const response = await this.api.post(`/api/schedules/${scheduleId}/bookings`, bookingData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create booking');
    }
  }

  async getBookingById(bookingId: number): Promise<any> {
    try {
      const response = await this.api.get(`/api/bookings/${bookingId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get booking');
    }
  }

  async getBookingByCode(code: string): Promise<any> {
    try {
      const response = await this.api.get(`/api/bookings/code/${code}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get booking');
    }
  }

  // Owner settings endpoints
  async getTicketTypes(): Promise<any> {
    try {
      const response = await this.api.get('/api/ticket-types');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get ticket types');
    }
  }

  async createTicketType(ticketTypeData: any): Promise<any> {
    try {
      const response = await this.api.post('/api/ticket-types', ticketTypeData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create ticket type');
    }
  }

  async updateTicketType(ticketTypeId: number, ticketTypeData: any): Promise<any> {
    try {
      const response = await this.api.put(`/api/ticket-types/${ticketTypeId}`, ticketTypeData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update ticket type');
    }
  }

  async deleteTicketType(ticketTypeId: number): Promise<any> {
    try {
      const response = await this.api.delete(`/api/ticket-types/${ticketTypeId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete ticket type');
    }
  }

  // Islands and destinations
  async getIslands(): Promise<any> {
    try {
      const response = await this.api.get('/api/islands');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get islands');
    }
  }

  async getDestinations(): Promise<any> {
    try {
      const response = await this.api.get('/api/destinations');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get destinations');
    }
  }

  // Registration endpoint
  async register(userData: any): Promise<any> {
    try {
      const response = await this.api.post('/register', userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  // Dashboard stats endpoint
  async getDashboardStats(): Promise<any> {
    try {
      const response = await this.api.get('/api/dashboard/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to get dashboard stats');
    }
  }
}

export const apiService = new ApiService();
export default apiService;
