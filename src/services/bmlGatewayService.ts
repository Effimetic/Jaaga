import * as Crypto from 'expo-crypto';

export interface BMLPaymentRequest {
  bookingId: string;
  amount: number;
  currency: string;
  customerName?: string;
  customerPhone?: string;
  description?: string;
  returnUrl?: string;
  webhookUrl?: string;
}

export interface BMLPaymentResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  gatewayRef?: string;
  status?: 'INITIATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED';
  error?: string;
  errorCode?: string;
}

export interface BMLWebhookData {
  transactionId: string;
  gatewayRef: string;
  status: 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'CANCELLED';
  amount: number;
  currency: string;
  timestamp: string;
  signature: string;
  rawData: any;
}

export class BMLGatewayService {
  private static instance: BMLGatewayService;
  
  private readonly baseUrl = process.env.EXPO_PUBLIC_BML_ENVIRONMENT === 'production' 
    ? 'https://api.bml.com.mv' 
    : 'https://sandbox-api.bml.com.mv';
  
  private readonly merchantId = process.env.EXPO_PUBLIC_BML_MERCHANT_ID || 'demo_merchant';
  private readonly apiKey = process.env.EXPO_PUBLIC_BML_API_KEY || 'demo_api_key';
  private readonly secretKey = process.env.EXPO_PUBLIC_BML_SECRET_KEY || 'demo_secret';

  public static getInstance(): BMLGatewayService {
    if (!BMLGatewayService.instance) {
      BMLGatewayService.instance = new BMLGatewayService();
    }
    return BMLGatewayService.instance;
  }

  /**
   * Initiate a payment transaction
   */
  async initiatePayment(request: BMLPaymentRequest): Promise<BMLPaymentResponse> {
    try {
      // Generate unique transaction reference
      const transactionId = await this.generateTransactionId();
      
      // Prepare payment payload
      const payload = {
        merchant_id: this.merchantId,
        transaction_id: transactionId,
        amount: request.amount,
        currency: request.currency,
        description: request.description || `Payment for booking ${request.bookingId}`,
        customer_name: request.customerName,
        customer_phone: request.customerPhone,
        return_url: request.returnUrl || 'app://payment-return',
        webhook_url: request.webhookUrl || 'https://api.ferry.mv/webhooks/bml',
        timestamp: new Date().toISOString(),
      };

      // Generate signature
      const signature = await this.generateSignature(payload);
      const signedPayload = { ...payload, signature };

      // In a real implementation, this would call the actual BML API
      // For demo purposes, we'll simulate the response
      const response = await this.simulateBMLAPI('/payments/initiate', signedPayload);

      return {
        success: true,
        transactionId,
        paymentUrl: response.payment_url,
        gatewayRef: response.gateway_ref,
        status: 'INITIATED',
      };

    } catch (error: any) {
      console.error('BML payment initiation failed:', error);
      return {
        success: false,
        error: error.message || 'Payment initiation failed',
        errorCode: error.code || 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionId: string): Promise<BMLPaymentResponse> {
    try {
      const payload = {
        merchant_id: this.merchantId,
        transaction_id: transactionId,
        timestamp: new Date().toISOString(),
      };

      const signature = await this.generateSignature(payload);
      const signedPayload = { ...payload, signature };

      const response = await this.simulateBMLAPI('/payments/status', signedPayload);

      return {
        success: true,
        transactionId,
        gatewayRef: response.gateway_ref,
        status: response.status,
      };

    } catch (error: any) {
      console.error('BML status check failed:', error);
      return {
        success: false,
        error: error.message || 'Status check failed',
        errorCode: error.code || 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Capture an authorized payment
   */
  async capturePayment(transactionId: string, amount?: number): Promise<BMLPaymentResponse> {
    try {
      const payload = {
        merchant_id: this.merchantId,
        transaction_id: transactionId,
        amount: amount, // Optional for partial capture
        timestamp: new Date().toISOString(),
      };

      const signature = await this.generateSignature(payload);
      const signedPayload = { ...payload, signature };

      const response = await this.simulateBMLAPI('/payments/capture', signedPayload);

      return {
        success: true,
        transactionId,
        gatewayRef: response.gateway_ref,
        status: 'CAPTURED',
      };

    } catch (error: any) {
      console.error('BML payment capture failed:', error);
      return {
        success: false,
        error: error.message || 'Payment capture failed',
        errorCode: error.code || 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Refund a captured payment
   */
  async refundPayment(transactionId: string, amount?: number, reason?: string): Promise<BMLPaymentResponse> {
    try {
      const payload = {
        merchant_id: this.merchantId,
        transaction_id: transactionId,
        amount: amount, // Optional for partial refund
        reason: reason || 'Customer refund request',
        timestamp: new Date().toISOString(),
      };

      const signature = await this.generateSignature(payload);
      const signedPayload = { ...payload, signature };

      const response = await this.simulateBMLAPI('/payments/refund', signedPayload);

      return {
        success: true,
        transactionId,
        gatewayRef: response.gateway_ref,
        status: 'CAPTURED', // Status remains captured, but refund is processed
      };

    } catch (error: any) {
      console.error('BML payment refund failed:', error);
      return {
        success: false,
        error: error.message || 'Payment refund failed',
        errorCode: error.code || 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Process webhook from BML
   */
  async processWebhook(webhookData: any): Promise<{ isValid: boolean; data?: BMLWebhookData }> {
    try {
      // Validate webhook signature
      const isValid = await this.validateWebhookSignature(webhookData);
      
      if (!isValid) {
        return { isValid: false };
      }

      const processedData: BMLWebhookData = {
        transactionId: webhookData.transaction_id,
        gatewayRef: webhookData.gateway_ref,
        status: webhookData.status,
        amount: parseFloat(webhookData.amount),
        currency: webhookData.currency,
        timestamp: webhookData.timestamp,
        signature: webhookData.signature,
        rawData: webhookData,
      };

      return { isValid: true, data: processedData };

    } catch (error) {
      console.error('Webhook processing failed:', error);
      return { isValid: false };
    }
  }

  /**
   * Generate HMAC signature for API requests
   */
  private async generateSignature(payload: any): Promise<string> {
    try {
      // Create deterministic string from payload
      const sortedKeys = Object.keys(payload).sort();
      const stringToSign = sortedKeys
        .map(key => `${key}=${payload[key]}`)
        .join('&');

      // Generate HMAC-SHA256 signature
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${stringToSign}&secret=${this.secretKey}`,
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      return signature;
    } catch (error) {
      console.error('Signature generation failed:', error);
      throw new Error('Failed to generate signature');
    }
  }

  /**
   * Validate webhook signature
   */
  private async validateWebhookSignature(webhookData: any): Promise<boolean> {
    try {
      const receivedSignature = webhookData.signature;
      const { signature, ...payloadWithoutSignature } = webhookData;
      
      const expectedSignature = await this.generateSignature(payloadWithoutSignature);
      
      return receivedSignature === expectedSignature;
    } catch (error) {
      console.error('Webhook signature validation failed:', error);
      return false;
    }
  }

  /**
   * Generate unique transaction ID
   */
  private async generateTransactionId(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 8);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Simulate BML API calls (for demo purposes)
   * In production, this would make actual HTTP requests to BML
   */
  private async simulateBMLAPI(endpoint: string, payload: any): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate different responses based on endpoint
    switch (endpoint) {
      case '/payments/initiate':
        return {
          status: 'success',
          payment_url: `${this.baseUrl}/pay/${payload.transaction_id}`,
          gateway_ref: `BML_${Date.now()}`,
          message: 'Payment initiated successfully',
        };

      case '/payments/status':
        // Simulate different payment statuses
        const statuses = ['AUTHORIZED', 'CAPTURED', 'FAILED'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        return {
          status: randomStatus,
          gateway_ref: `BML_${Date.now()}`,
          amount: 100.00,
          currency: 'MVR',
        };

      case '/payments/capture':
        return {
          status: 'success',
          gateway_ref: `BML_${Date.now()}`,
          message: 'Payment captured successfully',
        };

      case '/payments/refund':
        return {
          status: 'success',
          gateway_ref: `BML_${Date.now()}`,
          refund_id: `REF_${Date.now()}`,
          message: 'Refund processed successfully',
        };

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  /**
   * Format amount for BML (they expect amounts in cents/laari)
   */
  formatAmount(amount: number): number {
    // Convert MVR to laari (multiply by 100)
    return Math.round(amount * 100);
  }

  /**
   * Parse amount from BML response (convert laari to MVR)
   */
  parseAmount(amount: number): number {
    // Convert laari to MVR (divide by 100)
    return amount / 100;
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return ['MVR', 'USD'];
  }

  /**
   * Validate payment amount
   */
  validateAmount(amount: number, currency: string): { isValid: boolean; error?: string } {
    if (amount <= 0) {
      return { isValid: false, error: 'Amount must be greater than zero' };
    }

    if (currency === 'MVR' && amount < 1) {
      return { isValid: false, error: 'Minimum amount is MVR 1.00' };
    }

    if (currency === 'USD' && amount < 0.1) {
      return { isValid: false, error: 'Minimum amount is USD 0.10' };
    }

    if (amount > 100000) {
      return { isValid: false, error: 'Amount exceeds maximum limit' };
    }

    return { isValid: true };
  }

  /**
   * Get payment methods available for currency
   */
  getPaymentMethods(currency: string): string[] {
    const methods = ['VISA', 'MASTERCARD', 'AMEX'];
    
    if (currency === 'MVR') {
      methods.push('BML_DEBIT', 'MALDIVIAN_HERITAGE_BANK');
    }

    return methods;
  }
}

// Export singleton instance
export const bmlGatewayService = BMLGatewayService.getInstance();
