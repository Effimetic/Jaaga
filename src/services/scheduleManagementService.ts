import { supabase } from '../config/supabase';
import {
    ApiResponse,
    RecurrencePattern,
    RouteStop,
    Schedule,
    ScheduleSegment,
    ScheduleTemplate
} from '../types';

export interface MultiStopSchedule {
  id?: string;
  owner_id: string;
  boat_id: string;
  template_id?: string;
  name: string;
  description?: string;
  route_stops: RouteStop[];
  segments: ScheduleSegment[];
  start_date: string;
  end_date?: string;
  recurrence?: RecurrencePattern;
  pricing_tier: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'COMPLETED';
}

export interface ScheduleConflict {
  schedule_id: string;
  boat_name: string;
  conflicting_time: string;
  overlap_duration: number;
}

export interface ScheduleStats {
  total_schedules: number;
  active_schedules: number;
  draft_schedules: number;
  total_bookings: number;
  revenue_this_month: number;
  upcoming_departures: number;
}

export class ScheduleManagementService {
  private static instance: ScheduleManagementService;

  public static getInstance(): ScheduleManagementService {
    if (!ScheduleManagementService.instance) {
      ScheduleManagementService.instance = new ScheduleManagementService();
    }
    return ScheduleManagementService.instance;
  }

  /**
   * Create new multi-stop schedule
   */
  async createSchedule(scheduleData: MultiStopSchedule): Promise<ApiResponse<Schedule>> {
    try {
      // Validate schedule data
      const validation = this.validateScheduleData(scheduleData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          data: null,
        };
      }

      // Check for conflicts
      const conflicts = await this.checkScheduleConflicts(
        scheduleData.boat_id, 
        scheduleData.start_date, 
        scheduleData.segments
      );

      if (conflicts.length > 0) {
        return {
          success: false,
          error: `Schedule conflicts detected: ${conflicts.map(c => c.boat_name).join(', ')}`,
          data: null,
        };
      }

      // Generate recurring schedule instances if needed
      const scheduleInstances = scheduleData.recurrence 
        ? this.generateRecurringInstances(scheduleData)
        : [this.createScheduleInstance(scheduleData, scheduleData.start_date)];

      // Insert schedules
      const { data, error } = await supabase
        .from('schedules')
        .insert(scheduleInstances)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Schedule creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create schedule',
        data: null,
      };
    }
  }

  /**
   * Update existing schedule
   */
  async updateSchedule(scheduleId: string, scheduleData: Partial<MultiStopSchedule>): Promise<ApiResponse<Schedule>> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .update({
          ...scheduleData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Schedule update failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to update schedule',
        data: null,
      };
    }
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId: string): Promise<ApiResponse<boolean>> {
    try {
      // Check if schedule has bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('schedule_id', scheduleId)
        .limit(1);

      if (bookings && bookings.length > 0) {
        return {
          success: false,
          error: 'Cannot delete schedule with existing bookings',
          data: false,
        };
      }

      // Soft delete the schedule
      const { error } = await supabase
        .from('schedules')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      if (error) throw error;

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      console.error('Schedule deletion failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete schedule',
        data: false,
      };
    }
  }

  /**
   * Get schedules for owner
   */
  async getOwnerSchedules(
    ownerId: string, 
    filters?: {
      status?: string;
      boat_id?: string;
      from_date?: string;
      to_date?: string;
    }
  ): Promise<ApiResponse<Schedule[]>> {
    try {
      let query = supabase
        .from('schedules')
        .select(`
          *,
          boat:boats(id, name, registration, capacity),
          schedule_ticket_types(
            ticket_type:ticket_types(*)
          )
        `)
        .eq('owner_id', ownerId)
        .order('start_at', { ascending: true });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.boat_id) {
        query = query.eq('boat_id', filters.boat_id);
      }
      if (filters?.from_date) {
        query = query.gte('start_at', filters.from_date);
      }
      if (filters?.to_date) {
        query = query.lte('start_at', filters.to_date);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Failed to fetch schedules:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch schedules',
        data: [],
      };
    }
  }

  /**
   * Create schedule template
   */
  async createTemplate(templateData: {
    owner_id: string;
    name: string;
    description?: string;
    route_stops: RouteStop[];
    segments: ScheduleSegment[];
    default_boat_id?: string;
    pricing_tier: string;
  }): Promise<ApiResponse<ScheduleTemplate>> {
    try {
      const { data, error } = await supabase
        .from('schedule_templates')
        .insert([{
          ...templateData,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Template creation failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create template',
        data: null,
      };
    }
  }

  /**
   * Get schedule templates
   */
  async getTemplates(ownerId: string): Promise<ApiResponse<ScheduleTemplate[]>> {
    try {
      const { data, error } = await supabase
        .from('schedule_templates')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };
    } catch (error: any) {
      console.error('Failed to fetch templates:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch templates',
        data: [],
      };
    }
  }

  /**
   * Create schedule from template
   */
  async createFromTemplate(
    templateId: string, 
    overrides: {
      boat_id: string;
      start_date: string;
      end_date?: string;
      recurrence?: RecurrencePattern;
    }
  ): Promise<ApiResponse<Schedule>> {
    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('schedule_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Create schedule from template
      const scheduleData: MultiStopSchedule = {
        owner_id: template.owner_id,
        boat_id: overrides.boat_id,
        template_id: templateId,
        name: template.name,
        description: template.description,
        route_stops: template.route_stops,
        segments: template.segments,
        start_date: overrides.start_date,
        end_date: overrides.end_date,
        recurrence: overrides.recurrence,
        pricing_tier: template.pricing_tier,
        status: 'DRAFT',
      };

      return await this.createSchedule(scheduleData);
    } catch (error: any) {
      console.error('Schedule creation from template failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to create schedule from template',
        data: null,
      };
    }
  }

  /**
   * Check for schedule conflicts
   */
  private async checkScheduleConflicts(
    boatId: string, 
    startDate: string, 
    segments: ScheduleSegment[]
  ): Promise<ScheduleConflict[]> {
    try {
      const conflicts: ScheduleConflict[] = [];

      // Get existing schedules for the same boat on the same day
      const { data: existingSchedules } = await supabase
        .from('schedules')
        .select(`
          id, 
          start_at,
          segments,
          boat:boats(name)
        `)
        .eq('boat_id', boatId)
        .eq('status', 'ACTIVE')
        .gte('start_at', startDate)
        .lt('start_at', new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000).toISOString());

      if (!existingSchedules) return conflicts;

      // Check each existing schedule for time conflicts
      for (const existingSchedule of existingSchedules) {
        const existingSegments = existingSchedule.segments as ScheduleSegment[];
        
        for (const newSegment of segments) {
          for (const existingSegment of existingSegments) {
            const overlap = this.calculateTimeOverlap(newSegment, existingSegment);
            
            if (overlap > 0) {
              conflicts.push({
                schedule_id: existingSchedule.id,
                boat_name: existingSchedule.boat.name,
                conflicting_time: existingSegment.departure_time,
                overlap_duration: overlap,
              });
            }
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Conflict check failed:', error);
      return [];
    }
  }

  /**
   * Calculate time overlap between two segments (in minutes)
   */
  private calculateTimeOverlap(segment1: ScheduleSegment, segment2: ScheduleSegment): number {
    const start1 = new Date(`1970-01-01T${segment1.departure_time}`).getTime();
    const end1 = new Date(`1970-01-01T${segment1.arrival_time}`).getTime();
    const start2 = new Date(`1970-01-01T${segment2.departure_time}`).getTime();
    const end2 = new Date(`1970-01-01T${segment2.arrival_time}`).getTime();

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    return overlapEnd > overlapStart ? (overlapEnd - overlapStart) / (1000 * 60) : 0;
  }

  /**
   * Validate schedule data
   */
  private validateScheduleData(scheduleData: MultiStopSchedule): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!scheduleData.name?.trim()) {
      errors.push('Schedule name is required');
    }

    if (!scheduleData.boat_id) {
      errors.push('Boat selection is required');
    }

    if (!scheduleData.route_stops || scheduleData.route_stops.length < 2) {
      errors.push('At least 2 stops are required');
    }

    if (!scheduleData.segments || scheduleData.segments.length === 0) {
      errors.push('At least 1 schedule segment is required');
    }

    // Validate time sequence
    if (scheduleData.segments) {
      for (let i = 1; i < scheduleData.segments.length; i++) {
        const prevArrival = new Date(`1970-01-01T${scheduleData.segments[i-1].arrival_time}`);
        const currDeparture = new Date(`1970-01-01T${scheduleData.segments[i].departure_time}`);
        
        if (currDeparture <= prevArrival) {
          errors.push(`Invalid time sequence in segments ${i} and ${i+1}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate recurring schedule instances
   */
  private generateRecurringInstances(scheduleData: MultiStopSchedule): any[] {
    const instances = [];
    const startDate = new Date(scheduleData.start_date);
    const endDate = scheduleData.end_date ? new Date(scheduleData.end_date) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    if (!scheduleData.recurrence) {
      return [this.createScheduleInstance(scheduleData, scheduleData.start_date)];
    }

    let currentDate = new Date(startDate);
    let instanceCount = 0;
    const maxInstances = 100; // Safety limit

    while (currentDate <= endDate && instanceCount < maxInstances) {
      if (this.shouldCreateInstance(currentDate, scheduleData.recurrence)) {
        instances.push(this.createScheduleInstance(scheduleData, currentDate.toISOString().split('T')[0]));
        instanceCount++;
      }

      currentDate = this.getNextDate(currentDate, scheduleData.recurrence);
    }

    return instances;
  }

  /**
   * Check if instance should be created for given date and pattern
   */
  private shouldCreateInstance(date: Date, pattern: RecurrencePattern): boolean {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

    switch (pattern.type) {
      case 'daily':
        return true;
      case 'weekly':
        return pattern.weekdays ? pattern.weekdays.includes(dayOfWeek) : true;
      case 'monthly':
        return date.getDate() === new Date(pattern.start_date || date).getDate();
      default:
        return false;
    }
  }

  /**
   * Get next date based on recurrence pattern
   */
  private getNextDate(currentDate: Date, pattern: RecurrencePattern): Date {
    const nextDate = new Date(currentDate);
    
    switch (pattern.type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + (pattern.interval || 1));
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + (pattern.interval || 1));
        break;
    }

    return nextDate;
  }

  /**
   * Create single schedule instance
   */
  private createScheduleInstance(scheduleData: MultiStopSchedule, date: string): any {
    const baseDateTime = new Date(`${date}T${scheduleData.segments[0].departure_time}`);

    return {
      owner_id: scheduleData.owner_id,
      boat_id: scheduleData.boat_id,
      template_id: scheduleData.template_id,
      start_at: baseDateTime.toISOString(),
      segments: scheduleData.segments.map(segment => ({
        ...segment,
        departure_time: new Date(`${date}T${segment.departure_time}`).toISOString(),
        arrival_time: new Date(`${date}T${segment.arrival_time}`).toISOString(),
      })),
      recurrence: scheduleData.recurrence,
      status: scheduleData.status || 'ACTIVE',
      inherits_pricing: true,
    };
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStatistics(ownerId: string): Promise<ScheduleStats> {
    try {
      // Get schedule counts
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id, status')
        .eq('owner_id', ownerId);

      // Get booking counts and revenue
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, total, currency, created_at, schedule_id')
        .eq('owner_id', ownerId);

      // Get upcoming departures (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { data: upcomingSchedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('status', 'ACTIVE')
        .gte('start_at', new Date().toISOString())
        .lte('start_at', nextWeek.toISOString());

      // Calculate this month's revenue
      const thisMonth = new Date();
      const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const monthlyBookings = bookings?.filter(b => 
        new Date(b.created_at) >= startOfMonth
      ) || [];

      const revenueThisMonth = monthlyBookings.reduce((sum, booking) => 
        sum + (booking.total || 0), 0
      );

      return {
        total_schedules: schedules?.length || 0,
        active_schedules: schedules?.filter(s => s.status === 'ACTIVE').length || 0,
        draft_schedules: schedules?.filter(s => s.status === 'DRAFT').length || 0,
        total_bookings: bookings?.length || 0,
        revenue_this_month: revenueThisMonth,
        upcoming_departures: upcomingSchedules?.length || 0,
      };
    } catch (error) {
      console.error('Failed to get schedule statistics:', error);
      return {
        total_schedules: 0,
        active_schedules: 0,
        draft_schedules: 0,
        total_bookings: 0,
        revenue_this_month: 0,
        upcoming_departures: 0,
      };
    }
  }
}

// Export singleton instance
export const scheduleManagementService = ScheduleManagementService.getInstance();
