import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import {
    ApiResponse,
    Booking,
    OwnerBankAccount,
    PaymentMethod,
    PaymentReceipt
} from '../types';
import { bmlGatewayService } from './bmlGatewayService';

export interface PaymentProcessingResult {
  success: boolean;
  transactionId?: string;
  gatewayRef?: string;
  status?: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED';
  error?: string;
  requiresAction?: boolean;
  actionUrl?: string;
  receipt?: PaymentReceipt;
}

export interface BankTransferUpload {
  file: DocumentPicker.DocumentPickerAsset;
  accountId: string;
  reference?: string;
  amount: number;
  currency: string;
}

export interface OCRResult {
  amount?: number;
  currency?: string;
  accountNumber?: string;
  date?: string;
  reference?: string;
  confidence: number;
  flags: string[];
}

export class PaymentService {
  private static instance: PaymentService;

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Process payment based on selected method
   */
  async processPayment(
    booking: Booking,
    paymentMethod: PaymentMethod,
    additionalData?: any
  ): Promise<PaymentProcessingResult> {
    try {
      switch (paymentMethod) {
        case 'CASH':
          return await this.processCashPayment(booking);
        case 'CARD_BML':
          return await this.processCardPayment(booking, additionalData);
        case 'BANK_TRANSFER':
          return await this.processBankTransferPayment(booking, additionalData);
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }
    } catch (error: any) {
      console.error('Payment processing failed:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed',
        status: 'FAILED',
      };
    }
  }

  /**
   * Process cash payment (booking held for counter payment)
   */
  private async processCashPayment(booking: Booking): Promise<PaymentProcessingResult> {
    try {
      // Update booking status to reserved with expiry
      const holdExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours hold
      
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'RESERVED',
          payment_status: 'UNPAID',
          hold_expires_at: holdExpiry.toISOString(),
        })
        .eq('id', booking.id);

      if (error) throw error;

      // Create payment receipt record
      const receiptData = {
        owner_id: booking.owner_id,
        from_type: 'PUBLIC' as const,
        amount: booking.total,
        currency: booking.currency,
        method: 'CASH' as const,
        status: 'RECORDED' as const,
        reference: `CASH_${booking.id.slice(-8)}`,
      };

      const { data: receipt, error: receiptError } = await supabase
        .from('payment_receipts')
        .insert([receiptData])
        .select()
        .single();

      if (receiptError) throw receiptError;

      return {
        success: true,
        status: 'PENDING',
        receipt,
      };

    } catch (error: any) {
      console.error('Cash payment processing failed:', error);
      throw error;
    }
  }

  /**
   * Process card payment via BML Gateway
   */
  private async processCardPayment(
    booking: Booking, 
    customerData?: any
  ): Promise<PaymentProcessingResult> {
    try {
      // Validate amount
      const validation = bmlGatewayService.validateAmount(booking.total, booking.currency);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Create gateway transaction record
      const transactionData = {
        owner_id: booking.owner_id,
        booking_id: booking.id,
        method: 'CARD_BML' as const,
        currency: booking.currency,
        amount: booking.total,
        status: 'INITIATED' as const,
      };

      const { data: transaction, error: transactionError } = await supabase
        .from('gateway_transactions')
        .insert([transactionData])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Initiate payment with BML
      const paymentRequest = {
        bookingId: booking.id,
        amount: bmlGatewayService.formatAmount(booking.total),
        currency: booking.currency,
        customerName: customerData?.name,
        customerPhone: customerData?.phone,
        description: `Ferry ticket booking ${booking.id.slice(-8)}`,
      };

      const bmlResponse = await bmlGatewayService.initiatePayment(paymentRequest);

      if (!bmlResponse.success) {
        // Update transaction status
        await supabase
          .from('gateway_transactions')
          .update({ status: 'FAILED' })
          .eq('id', transaction.id);

        throw new Error(bmlResponse.error || 'Payment initiation failed');
      }

      // Update transaction with gateway reference
      await supabase
        .from('gateway_transactions')
        .update({
          gateway_ref: bmlResponse.gatewayRef,
          raw_payload: { bml_response: bmlResponse },
        })
        .eq('id', transaction.id);

      return {
        success: true,
        transactionId: bmlResponse.transactionId,
        gatewayRef: bmlResponse.gatewayRef,
        status: 'PENDING',
        requiresAction: true,
        actionUrl: bmlResponse.paymentUrl,
      };

    } catch (error: any) {
      console.error('Card payment processing failed:', error);
      throw error;
    }
  }

  /**
   * Process bank transfer payment
   */
  private async processBankTransferPayment(
    booking: Booking,
    transferData?: any
  ): Promise<PaymentProcessingResult> {
    try {
      // Update booking to pending transfer verification
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'RESERVED',
          payment_status: 'UNPAID',
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Create payment receipt record
      const receiptData = {
        owner_id: booking.owner_id,
        from_type: 'PUBLIC' as const,
        amount: booking.total,
        currency: booking.currency,
        method: 'BANK_TRANSFER' as const,
        status: 'RECORDED' as const,
        to_account_id: transferData?.selectedAccountId,
        reference: transferData?.reference,
        attachments: [], // Will be updated when receipt is uploaded
      };

      const { data: receipt, error: receiptError } = await supabase
        .from('payment_receipts')
        .insert([receiptData])
        .select()
        .single();

      if (receiptError) throw receiptError;

      return {
        success: true,
        status: 'PENDING',
        receipt,
      };

    } catch (error: any) {
      console.error('Bank transfer processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle BML webhook callback
   */
  async handleBMLWebhook(webhookData: any): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate webhook
      const validation = await bmlGatewayService.processWebhook(webhookData);
      if (!validation.isValid || !validation.data) {
        throw new Error('Invalid webhook signature');
      }

      const { data } = validation;

      // Find the transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('gateway_transactions')
        .select('*, booking:bookings(*)')
        .eq('gateway_ref', data.gatewayRef)
        .single();

      if (transactionError || !transaction) {
        throw new Error('Transaction not found');
      }

      // Update transaction status
      await supabase
        .from('gateway_transactions')
        .update({
          status: data.status,
          raw_payload: { ...transaction.raw_payload, webhook_data: data },
        })
        .eq('id', transaction.id);

      // Handle different statuses
      switch (data.status) {
        case 'AUTHORIZED':
          // Auto-capture for ferry bookings
          await this.capturePayment(transaction.id);
          break;

        case 'CAPTURED':
          await this.confirmBookingPayment(transaction.booking_id);
          break;

        case 'FAILED':
        case 'CANCELLED':
          await this.cancelBookingPayment(transaction.booking_id);
          break;
      }

      return { success: true };

    } catch (error: any) {
      console.error('Webhook processing failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Capture an authorized payment
   */
  async capturePayment(transactionId: string): Promise<PaymentProcessingResult> {
    try {
      const { data: transaction, error } = await supabase
        .from('gateway_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error || !transaction) {
        throw new Error('Transaction not found');
      }

      const captureResponse = await bmlGatewayService.capturePayment(transaction.gateway_ref);

      if (!captureResponse.success) {
        throw new Error(captureResponse.error || 'Capture failed');
      }

      // Update transaction status
      await supabase
        .from('gateway_transactions')
        .update({ status: 'CAPTURED' })
        .eq('id', transactionId);

      // Confirm booking
      await this.confirmBookingPayment(transaction.booking_id);

      return {
        success: true,
        status: 'CAPTURED',
        transactionId: transaction.id,
      };

    } catch (error: any) {
      console.error('Payment capture failed:', error);
      throw error;
    }
  }

  /**
   * Confirm booking payment and issue tickets
   */
  private async confirmBookingPayment(bookingId: string): Promise<void> {
    try {
      // Update booking status
      await supabase
        .from('bookings')
        .update({
          status: 'CONFIRMED',
          payment_status: 'PAID',
        })
        .eq('id', bookingId);

      // This would trigger ticket issuance
      // The actual ticket creation would be handled by the booking service
      console.log(`Booking ${bookingId} payment confirmed`);

    } catch (error) {
      console.error('Booking confirmation failed:', error);
      throw error;
    }
  }

  /**
   * Cancel booking due to payment failure
   */
  private async cancelBookingPayment(bookingId: string): Promise<void> {
    try {
      await supabase
        .from('bookings')
        .update({
          status: 'CANCELLED',
          payment_status: 'UNPAID',
        })
        .eq('id', bookingId);

      console.log(`Booking ${bookingId} cancelled due to payment failure`);

    } catch (error) {
      console.error('Booking cancellation failed:', error);
      throw error;
    }
  }

  /**
   * Upload bank transfer receipt
   */
  async uploadTransferReceipt(
    receiptId: string,
    uploadData: BankTransferUpload
  ): Promise<{ success: boolean; ocrResult?: OCRResult; error?: string }> {
    try {
      // Upload file to Supabase Storage
      const fileName = `transfer_receipts/${receiptId}_${Date.now()}.${uploadData.file.name?.split('.').pop()}`;
      
      // Read file as base64
      const fileContent = await FileSystem.readAsStringAsync(uploadData.file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, fileContent, {
          contentType: uploadData.file.mimeType || 'application/octet-stream',
        });

      if (uploadError) throw uploadError;

      // Process OCR (simplified simulation)
      const ocrResult = await this.processOCR(uploadData.file, uploadData);

      // Update payment receipt with file and OCR data
      const { error: updateError } = await supabase
        .from('payment_receipts')
        .update({
          attachments: [uploadResult.path],
        })
        .eq('id', receiptId);

      if (updateError) throw updateError;

      // Create OCR record if processing was successful
      if (ocrResult.confidence > 0.5) {
        await supabase
          .from('transfer_slip_ocr')
          .insert([{
            payment_receipt_id: receiptId,
            extracted_json: ocrResult,
            confidence: ocrResult.confidence,
            flags: ocrResult.flags,
          }]);
      }

      return {
        success: true,
        ocrResult,
      };

    } catch (error: any) {
      console.error('Receipt upload failed:', error);
      return {
        success: false,
        error: error.message || 'Upload failed',
      };
    }
  }

  /**
   * Process OCR on transfer receipt (simplified simulation)
   */
  private async processOCR(
    file: DocumentPicker.DocumentPickerAsset,
    uploadData: BankTransferUpload
  ): Promise<OCRResult> {
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate OCR results with some accuracy
    const confidence = 0.8 + Math.random() * 0.2; // 80-100% confidence
    const flags: string[] = [];

    // Check if amounts match
    const extractedAmount = uploadData.amount + (Math.random() - 0.5) * 2; // Slight variation
    if (Math.abs(extractedAmount - uploadData.amount) > 1) {
      flags.push('AMOUNT_MISMATCH');
    }

    // Simulate account number extraction
    const extractedAccount = '7730001234567'; // Simulated extraction
    
    return {
      amount: parseFloat(extractedAmount.toFixed(2)),
      currency: uploadData.currency,
      accountNumber: extractedAccount,
      date: new Date().toISOString().split('T')[0],
      reference: uploadData.reference || `AUTO_${Date.now()}`,
      confidence,
      flags,
    };
  }

  /**
   * Get available bank accounts for transfers
   */
  async getBankAccounts(ownerId: string): Promise<ApiResponse<OwnerBankAccount[]>> {
    try {
      const { data, error } = await supabase
        .from('owner_bank_accounts')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('active', true);

      if (error) throw error;

      return {
        success: true,
        data: data || [],
      };

    } catch (error: any) {
      console.error('Failed to fetch bank accounts:', error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  /**
   * Pick document for upload
   */
  async pickDocument(): Promise<DocumentPicker.DocumentPickerAsset | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        return result.assets[0];
      }

      return null;

    } catch (error) {
      console.error('Document picker failed:', error);
      Alert.alert('Error', 'Failed to pick document');
      return null;
    }
  }

  /**
   * Get payment status for booking
   */
  async getPaymentStatus(bookingId: string): Promise<{
    status: string;
    method?: PaymentMethod;
    transactionId?: string;
    receipt?: PaymentReceipt;
  }> {
    try {
      // Check for gateway transactions
      const { data: transaction } = await supabase
        .from('gateway_transactions')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (transaction) {
        return {
          status: transaction.status,
          method: transaction.method,
          transactionId: transaction.id,
        };
      }

      // Check for payment receipts
      const { data: receipt } = await supabase
        .from('payment_receipts')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (receipt) {
        return {
          status: receipt.status,
          method: receipt.method,
          receipt,
        };
      }

      return { status: 'UNPAID' };

    } catch (error) {
      console.error('Payment status check failed:', error);
      return { status: 'UNKNOWN' };
    }
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();
