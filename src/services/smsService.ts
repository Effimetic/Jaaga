import * as SMS from 'expo-sms';

export interface SMSMessage {
  to: string;
  body: string;
}

export interface TicketSMSData {
  passengerName: string;
  ticketId: string;
  bookingId: string;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  seatNumber?: string;
  qrCode: string;
  boatName: string;
  ownerBrand: string;
}

export class SMSService {
  private static instance: SMSService;

  public static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  /**
   * Check if SMS functionality is available on the device
   */
  async isSMSAvailable(): Promise<boolean> {
    try {
      return await SMS.isAvailableAsync();
    } catch (error) {
      console.error('Error checking SMS availability:', error);
      return false;
    }
  }

  /**
   * Send SMS message
   */
  async sendSMS(message: SMSMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const isAvailable = await this.isSMSAvailable();
      
      if (!isAvailable) {
        return { 
          success: false, 
          error: 'SMS functionality is not available on this device' 
        };
      }

      const result = await SMS.sendSMSAsync([message.to], message.body);
      
      return { success: result.result === 'sent' };
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send SMS' 
      };
    }
  }

  /**
   * Generate ticket SMS message
   */
  generateTicketSMS(data: TicketSMSData): string {
    const seatInfo = data.seatNumber ? `\nSeat: ${data.seatNumber}` : '';
    
    return `🎫 ${data.ownerBrand} Ticket
Passenger: ${data.passengerName}
Ticket: ${data.ticketId}
Booking: ${data.bookingId}

🚢 ${data.boatName}
📍 ${data.fromLocation} → ${data.toLocation}
🕒 ${data.departureTime}${seatInfo}

Present this ticket for boarding.
QR: ${data.qrCode}

Safe travels!`;
  }

  /**
   * Send ticket confirmation SMS
   */
  async sendTicketConfirmationSMS(
    phone: string, 
    ticketData: TicketSMSData
  ): Promise<{ success: boolean; error?: string }> {
    const message = this.generateTicketSMS(ticketData);
    
    return await this.sendSMS({
      to: phone,
      body: message,
    });
  }

  /**
   * Generate booking confirmation SMS
   */
  generateBookingConfirmationSMS(bookingId: string, totalAmount: number, currency: string): string {
    return `✅ Booking Confirmed!

Booking ID: ${bookingId}
Total: ${currency} ${totalAmount.toFixed(2)}

Your tickets will be sent shortly via SMS.

Thank you for choosing our service!`;
  }

  /**
   * Send booking confirmation SMS
   */
  async sendBookingConfirmationSMS(
    phone: string, 
    bookingId: string, 
    totalAmount: number, 
    currency: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = this.generateBookingConfirmationSMS(bookingId, totalAmount, currency);
    
    return await this.sendSMS({
      to: phone,
      body: message,
    });
  }

  /**
   * Generate agent credit warning SMS
   */
  generateCreditWarningSMS(agentName: string, currentCredit: number, creditLimit: number, currency: string): string {
    const percentage = Math.round((currentCredit / creditLimit) * 100);
    
    return `⚠️ Credit Warning

Hello ${agentName},

Your credit usage is at ${percentage}%
Used: ${currency} ${currentCredit.toFixed(2)}
Limit: ${currency} ${creditLimit.toFixed(2)}

Please settle your account to continue booking.`;
  }

  /**
   * Send agent credit warning SMS
   */
  async sendAgentCreditWarningSMS(
    phone: string,
    agentName: string,
    currentCredit: number,
    creditLimit: number,
    currency: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = this.generateCreditWarningSMS(agentName, currentCredit, creditLimit, currency);
    
    return await this.sendSMS({
      to: phone,
      body: message,
    });
  }

  /**
   * Generate agent connection approval SMS
   */
  generateConnectionApprovalSMS(agentName: string, ownerBrand: string, creditLimit: number, currency: string): string {
    return `✅ Connection Approved!

Hello ${agentName},

${ownerBrand} has approved your connection request.

Credit Limit: ${currency} ${creditLimit.toFixed(2)}
You can now start booking tickets!`;
  }

  /**
   * Send agent connection approval SMS
   */
  async sendConnectionApprovalSMS(
    phone: string,
    agentName: string,
    ownerBrand: string,
    creditLimit: number,
    currency: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = this.generateConnectionApprovalSMS(agentName, ownerBrand, creditLimit, currency);
    
    return await this.sendSMS({
      to: phone,
      body: message,
    });
  }

  /**
   * Generate schedule change notification SMS
   */
  generateScheduleChangeSMS(
    passengerName: string,
    bookingId: string,
    oldTime: string,
    newTime: string,
    route: string
  ): string {
    return `📅 Schedule Update

Hello ${passengerName},

Your booking ${bookingId} has been updated:

Route: ${route}
Old Time: ${oldTime}
New Time: ${newTime}

Please arrive 30 minutes before departure.`;
  }

  /**
   * Send schedule change notification SMS
   */
  async sendScheduleChangeSMS(
    phone: string,
    passengerName: string,
    bookingId: string,
    oldTime: string,
    newTime: string,
    route: string
  ): Promise<{ success: boolean; error?: string }> {
    const message = this.generateScheduleChangeSMS(passengerName, bookingId, oldTime, newTime, route);
    
    return await this.sendSMS({
      to: phone,
      body: message,
    });
  }

  /**
   * Format phone number for SMS (ensure + prefix)
   */
  formatPhoneForSMS(phone: string): string {
    let formatted = phone.replace(/\s+/g, '').replace(/^\+/, '');
    
    // Add Maldives country code if not present
    if (!formatted.startsWith('960')) {
      formatted = '960' + formatted.replace(/^0/, '');
    }
    
    return '+' + formatted;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): { isValid: boolean; formatted?: string } {
    try {
      const formatted = this.formatPhoneForSMS(phone);
      
      // Check if it's a valid Maldives number (+960 followed by 7 digits)
      const maldivesPhoneRegex = /^\+9607\d{6}$/;
      
      if (maldivesPhoneRegex.test(formatted)) {
        return { isValid: true, formatted };
      }
      
      return { isValid: false };
    } catch (error) {
      return { isValid: false };
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<{
    success: boolean;
    results: { phone: string; success: boolean; error?: string }[];
  }> {
    const results: { phone: string; success: boolean; error?: string }[] = [];
    
    for (const message of messages) {
      const result = await this.sendSMS(message);
      results.push({
        phone: message.to,
        success: result.success,
        error: result.error,
      });
    }
    
    const allSuccess = results.every(r => r.success);
    
    return {
      success: allSuccess,
      results,
    };
  }
}

// Export singleton instance
export const smsService = SMSService.getInstance();
