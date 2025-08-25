import {
    Agent,
    AgentOwnerLink,
    Booking,
    Owner,
    Schedule,
    Ticket,
    User
} from '../types';
import { smsService } from './smsService';

export interface NotificationPreferences {
  sms: boolean;
  email: boolean;
  push: boolean;
  bookingConfirmations: boolean;
  scheduleChanges: boolean;
  paymentReminders: boolean;
  creditWarnings: boolean;
  promotions: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'SMS' | 'EMAIL' | 'PUSH';
  subject?: string;
  template: string;
  variables: string[];
}

export interface NotificationRequest {
  type: 'BOOKING_CONFIRMATION' | 'TICKET_ISSUED' | 'SCHEDULE_CHANGE' | 'PAYMENT_REMINDER' | 
        'CREDIT_WARNING' | 'CONNECTION_APPROVED' | 'CONNECTION_REJECTED' | 'DEPARTURE_REMINDER';
  recipients: {
    phone?: string;
    email?: string;
    userId?: string;
    preferences?: NotificationPreferences;
  }[];
  data: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  scheduledFor?: Date;
}

export class NotificationService {
  private static instance: NotificationService;
  private templates: Record<string, NotificationTemplate> = {};

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates() {
    this.templates = {
      BOOKING_CONFIRMATION: {
        id: 'booking_confirmation',
        name: 'Booking Confirmation',
        type: 'SMS',
        template: `✅ Booking Confirmed!

Booking: {{bookingId}}
Total: {{currency}} {{amount}}
Trip: {{boatName}}
Date: {{departureDate}}
Time: {{departureTime}}

Your tickets will be sent shortly.

{{companyName}}`,
        variables: ['bookingId', 'currency', 'amount', 'boatName', 'departureDate', 'departureTime', 'companyName']
      },

      TICKET_ISSUED: {
        id: 'ticket_issued',
        name: 'Ticket Issued',
        type: 'SMS',
        template: `🎫 {{companyName}} Ticket

Passenger: {{passengerName}}
Ticket: {{ticketId}}
{{boatName}}

📍 {{route}}
🕒 {{departureDateTime}}
{{seatInfo}}

Present this ticket for boarding.
Reference: {{bookingReference}}

Safe travels!`,
        variables: ['companyName', 'passengerName', 'ticketId', 'boatName', 'route', 'departureDateTime', 'seatInfo', 'bookingReference']
      },

      SCHEDULE_CHANGE: {
        id: 'schedule_change',
        name: 'Schedule Change',
        type: 'SMS',
        template: `📅 Schedule Update

{{passengerName}}, your trip has been updated:

Booking: {{bookingId}}
Boat: {{boatName}}
Route: {{route}}

Previous: {{oldDateTime}}
New Time: {{newDateTime}}

Please arrive 30 minutes early.

{{companyName}}`,
        variables: ['passengerName', 'bookingId', 'boatName', 'route', 'oldDateTime', 'newDateTime', 'companyName']
      },

      DEPARTURE_REMINDER: {
        id: 'departure_reminder',
        name: 'Departure Reminder',
        type: 'SMS',
        template: `⏰ Departure Reminder

{{passengerName}}, your trip departs in {{timeRemaining}}:

{{boatName}}
{{route}}
Departure: {{departureTime}}
{{seatInfo}}

Please arrive 30 minutes early with valid ID.

{{companyName}}`,
        variables: ['passengerName', 'timeRemaining', 'boatName', 'route', 'departureTime', 'seatInfo', 'companyName']
      },

      CREDIT_WARNING: {
        id: 'credit_warning',
        name: 'Credit Warning',
        type: 'SMS',
        template: `⚠️ Credit Warning

{{agentName}}, your credit usage is at {{percentage}}%

Used: {{currency}} {{usedAmount}}
Limit: {{currency}} {{creditLimit}}
Available: {{currency}} {{availableAmount}}

Please settle your account to continue booking.

{{companyName}}`,
        variables: ['agentName', 'percentage', 'currency', 'usedAmount', 'creditLimit', 'availableAmount', 'companyName']
      },

      CONNECTION_APPROVED: {
        id: 'connection_approved',
        name: 'Connection Approved',
        type: 'SMS',
        template: `✅ Connection Approved!

{{agentName}}, {{ownerName}} has approved your connection request.

Credit Limit: {{currency}} {{creditLimit}}
Payment Terms: {{paymentTerms}} days
Settlement Currency: {{settlementCurrency}}

You can now start booking tickets!

Welcome aboard! 🚢`,
        variables: ['agentName', 'ownerName', 'currency', 'creditLimit', 'paymentTerms', 'settlementCurrency']
      },

      CONNECTION_REJECTED: {
        id: 'connection_rejected',
        name: 'Connection Rejected',
        type: 'SMS',
        template: `❌ Connection Request Update

{{agentName}}, unfortunately {{ownerName}} has declined your connection request.

{{reason}}

You can explore other ferry operators or contact them directly for more information.`,
        variables: ['agentName', 'ownerName', 'reason']
      },

      PAYMENT_REMINDER: {
        id: 'payment_reminder',
        name: 'Payment Reminder',
        type: 'SMS',
        template: `💳 Payment Reminder

{{recipientName}}, you have an outstanding payment:

Amount: {{currency}} {{amount}}
Due Date: {{dueDate}}
{{description}}

Please complete payment to avoid service interruption.

{{companyName}}`,
        variables: ['recipientName', 'currency', 'amount', 'dueDate', 'description', 'companyName']
      }
    };
  }

  /**
   * Send notification
   */
  async sendNotification(request: NotificationRequest): Promise<{
    success: boolean;
    results: {
      recipient: string;
      success: boolean;
      error?: string;
    }[];
  }> {
    const results: { recipient: string; success: boolean; error?: string }[] = [];

    for (const recipient of request.recipients) {
      try {
        // Check user preferences if userId provided
        if (recipient.userId) {
          const preferences = await this.getUserNotificationPreferences(recipient.userId);
          if (!this.shouldSendNotification(request.type, preferences)) {
            results.push({
              recipient: recipient.phone || recipient.email || recipient.userId,
              success: false,
              error: 'User preferences block this notification type'
            });
            continue;
          }
        }

        // Send SMS if phone provided
        if (recipient.phone) {
          const smsResult = await this.sendSMSNotification(request, recipient.phone);
          results.push({
            recipient: recipient.phone,
            success: smsResult.success,
            error: smsResult.error
          });
        }

        // TODO: Add email and push notification support
        if (recipient.email) {
          // Email notifications would go here
          results.push({
            recipient: recipient.email,
            success: false,
            error: 'Email notifications not implemented yet'
          });
        }

      } catch (error: any) {
        results.push({
          recipient: recipient.phone || recipient.email || recipient.userId || 'unknown',
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      results
    };
  }

  /**
   * Send SMS notification using template
   */
  private async sendSMSNotification(
    request: NotificationRequest, 
    phone: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const template = this.templates[request.type];
      if (!template) {
        throw new Error(`Template not found for notification type: ${request.type}`);
      }

      const message = this.renderTemplate(template.template, request.data);
      
      return await smsService.sendSMS({
        to: phone,
        body: message
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Render template with data
   */
  private renderTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(
    type: NotificationRequest['type'], 
    preferences: NotificationPreferences
  ): boolean {
    if (!preferences.sms) return false;

    switch (type) {
      case 'BOOKING_CONFIRMATION':
      case 'TICKET_ISSUED':
        return preferences.bookingConfirmations;
      case 'SCHEDULE_CHANGE':
        return preferences.scheduleChanges;
      case 'PAYMENT_REMINDER':
        return preferences.paymentReminders;
      case 'CREDIT_WARNING':
        return preferences.creditWarnings;
      default:
        return true; // Allow other notifications by default
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // For now, return default preferences
    // In a real app, this would fetch from the database
    return {
      sms: true,
      email: false,
      push: false,
      bookingConfirmations: true,
      scheduleChanges: true,
      paymentReminders: true,
      creditWarnings: true,
      promotions: false,
    };
  }

  // SPECIFIC NOTIFICATION METHODS

  /**
   * Send booking confirmation
   */
  async sendBookingConfirmation(
    booking: Booking & { schedule: Schedule & { boat: any; owner: any } },
    recipientPhone: string
  ): Promise<void> {
    await this.sendNotification({
      type: 'BOOKING_CONFIRMATION',
      recipients: [{ phone: recipientPhone }],
      data: {
        bookingId: booking.id.slice(-8).toUpperCase(),
        currency: booking.currency,
        amount: booking.total.toFixed(2),
        boatName: booking.schedule.boat?.name || 'Ferry',
        departureDate: new Date(booking.schedule.start_at).toLocaleDateString(),
        departureTime: new Date(booking.schedule.start_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        companyName: booking.schedule.owner?.brand_name || 'Ferry Services'
      },
      priority: 'HIGH'
    });
  }

  /**
   * Send ticket issued notification
   */
  async sendTicketIssued(
    ticket: Ticket & { booking: Booking & { schedule: Schedule & { boat: any; owner: any } } },
    recipientPhone: string
  ): Promise<void> {
    const seatInfo = ticket.seat_id ? `Seat: ${ticket.seat_id}` : 'General Seating';
    
    await this.sendNotification({
      type: 'TICKET_ISSUED',
      recipients: [{ phone: recipientPhone }],
      data: {
        companyName: ticket.booking.schedule.owner?.brand_name || 'Ferry Services',
        passengerName: ticket.passenger_name,
        ticketId: ticket.id.slice(-8).toUpperCase(),
        boatName: ticket.booking.schedule.boat?.name || 'Ferry',
        route: 'Route Information', // Would come from schedule segments
        departureDateTime: new Date(ticket.booking.schedule.start_at).toLocaleString(),
        seatInfo,
        bookingReference: ticket.booking.id.slice(-8).toUpperCase()
      },
      priority: 'HIGH'
    });
  }

  /**
   * Send departure reminder
   */
  async sendDepartureReminder(
    ticket: Ticket & { booking: Booking & { schedule: Schedule & { boat: any; owner: any } } },
    recipientPhone: string,
    timeRemaining: string
  ): Promise<void> {
    const seatInfo = ticket.seat_id ? `Seat: ${ticket.seat_id}` : '';
    
    await this.sendNotification({
      type: 'DEPARTURE_REMINDER',
      recipients: [{ phone: recipientPhone }],
      data: {
        passengerName: ticket.passenger_name,
        timeRemaining,
        boatName: ticket.booking.schedule.boat?.name || 'Ferry',
        route: 'Route Information',
        departureTime: new Date(ticket.booking.schedule.start_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        seatInfo,
        companyName: ticket.booking.schedule.owner?.brand_name || 'Ferry Services'
      },
      priority: 'URGENT'
    });
  }

  /**
   * Send credit warning to agent
   */
  async sendCreditWarning(
    agent: Agent & { user: User },
    owner: Owner,
    link: AgentOwnerLink,
    usedAmount: number
  ): Promise<void> {
    const percentage = Math.round((usedAmount / link.credit_limit) * 100);
    const availableAmount = link.credit_limit - usedAmount;
    
    await this.sendNotification({
      type: 'CREDIT_WARNING',
      recipients: [{ phone: agent.user.phone, userId: agent.user.id }],
      data: {
        agentName: agent.display_name,
        percentage: percentage.toString(),
        currency: link.credit_currency,
        usedAmount: usedAmount.toFixed(2),
        creditLimit: link.credit_limit.toFixed(2),
        availableAmount: availableAmount.toFixed(2),
        companyName: owner.brand_name
      },
      priority: 'HIGH'
    });
  }

  /**
   * Send connection approved notification
   */
  async sendConnectionApproved(
    agent: Agent & { user: User },
    owner: Owner,
    link: AgentOwnerLink
  ): Promise<void> {
    await this.sendNotification({
      type: 'CONNECTION_APPROVED',
      recipients: [{ phone: agent.user.phone, userId: agent.user.id }],
      data: {
        agentName: agent.display_name,
        ownerName: owner.brand_name,
        currency: link.credit_currency,
        creditLimit: link.credit_limit.toFixed(2),
        paymentTerms: link.payment_terms_days.toString(),
        settlementCurrency: link.settlement_currency
      },
      priority: 'MEDIUM'
    });
  }

  /**
   * Schedule departure reminders for upcoming trips
   */
  async scheduleDepartureReminders(): Promise<void> {
    // This would typically be called by a cron job or scheduled task
    // Get all tickets for trips departing in the next 2 hours
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    try {
      // This is a simplified implementation
      // In a real app, you'd query the database for upcoming trips
      console.log('Checking for departure reminders between', now, 'and', twoHoursLater);
      
      // TODO: Implement actual database query and reminder scheduling
    } catch (error) {
      console.error('Error scheduling departure reminders:', error);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
