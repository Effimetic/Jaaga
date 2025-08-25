import * as Crypto from 'expo-crypto';
import { QRCodeData } from '../types';

export class QRCodeService {
  private static instance: QRCodeService;
  private readonly SECRET_KEY = 'boat-ticketing-secret-key'; // In production, this should be from environment

  public static getInstance(): QRCodeService {
    if (!QRCodeService.instance) {
      QRCodeService.instance = new QRCodeService();
    }
    return QRCodeService.instance;
  }

  /**
   * Generate QR code data for a ticket
   */
  async generateQRCode(data: Omit<QRCodeData, 'signature'>): Promise<string> {
    try {
      // Create the payload without signature
      const payload = {
        ticket_id: data.ticket_id,
        booking_id: data.booking_id,
        owner_id: data.owner_id,
        schedule_id: data.schedule_id,
        segment_key: data.segment_key,
        seat_id: data.seat_id,
        timestamp: Date.now(),
      };

      // Generate signature
      const signature = await this.generateSignature(payload);
      
      // Create final QR data
      const qrData: QRCodeData = {
        ...payload,
        signature,
      };

      // Return base64 encoded JSON
      return btoa(JSON.stringify(qrData));
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Validate QR code data
   */
  async validateQRCode(qrCodeString: string): Promise<{
    isValid: boolean;
    data?: QRCodeData;
    error?: string;
  }> {
    try {
      // Decode the QR string
      const decodedString = atob(qrCodeString);
      const qrData: QRCodeData = JSON.parse(decodedString);

      // Validate structure
      if (!this.validateQRStructure(qrData)) {
        return { isValid: false, error: 'Invalid QR code structure' };
      }

      // Validate signature
      const isSignatureValid = await this.validateSignature(qrData);
      if (!isSignatureValid) {
        return { isValid: false, error: 'Invalid QR code signature' };
      }

      // Check if QR code is not too old (24 hours max)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - qrData.timestamp > maxAge) {
        return { isValid: false, error: 'QR code has expired' };
      }

      return { isValid: true, data: qrData };
    } catch (error) {
      console.error('Error validating QR code:', error);
      return { isValid: false, error: 'Invalid QR code format' };
    }
  }

  /**
   * Generate signature for QR data
   */
  private async generateSignature(data: any): Promise<string> {
    try {
      // Create string to sign (deterministic order)
      const stringToSign = JSON.stringify(data, Object.keys(data).sort());
      
      // Generate HMAC signature
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${stringToSign}${this.SECRET_KEY}`,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      return signature;
    } catch (error) {
      console.error('Error generating signature:', error);
      throw new Error('Failed to generate signature');
    }
  }

  /**
   * Validate signature
   */
  private async validateSignature(qrData: QRCodeData): Promise<boolean> {
    try {
      // Extract signature and create data without signature
      const { signature, ...dataWithoutSignature } = qrData;
      
      // Generate expected signature
      const expectedSignature = await this.generateSignature(dataWithoutSignature);
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Error validating signature:', error);
      return false;
    }
  }

  /**
   * Validate QR data structure
   */
  private validateQRStructure(data: any): data is QRCodeData {
    return (
      typeof data === 'object' &&
      typeof data.ticket_id === 'string' &&
      typeof data.booking_id === 'string' &&
      typeof data.owner_id === 'string' &&
      typeof data.schedule_id === 'string' &&
      typeof data.segment_key === 'string' &&
      typeof data.timestamp === 'number' &&
      typeof data.signature === 'string' &&
      (data.seat_id === undefined || typeof data.seat_id === 'string')
    );
  }

  /**
   * Generate a unique reference number for tickets
   */
  generateTicketReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${timestamp}${random}`.toUpperCase();
  }

  /**
   * Generate boarding pass data for display
   */
  generateBoardingPassData(ticket: any, booking: any, schedule: any): {
    qrCode: string;
    reference: string;
    displayInfo: any;
  } {
    const reference = this.generateTicketReference();
    
    const displayInfo = {
      passengerName: ticket.passenger_name,
      ticketId: ticket.id,
      bookingId: booking.id,
      boatName: schedule.boat.name,
      ownerBrand: schedule.owner.brand_name,
      departureTime: schedule.start_at,
      seatNumber: ticket.seat_id,
      reference: reference,
    };

    return {
      qrCode: ticket.qr_code,
      reference,
      displayInfo,
    };
  }

  /**
   * Format QR code for SMS delivery
   */
  formatQRForSMS(qrCode: string): string {
    // In a real app, this might be a shortened URL that redirects to the full QR
    // For now, we'll return a formatted version
    return `https://tickets.ferry.mv/qr/${qrCode.substr(0, 16)}...`;
  }

  /**
   * Generate verification code for manual entry
   */
  generateVerificationCode(ticketId: string): string {
    // Generate a 6-digit verification code based on ticket ID
    const hash = ticketId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return (hash % 900000 + 100000).toString();
  }
}

// Export singleton instance
export const qrCodeService = QRCodeService.getInstance();
