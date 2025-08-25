import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface SMSRequest {
  phone: string;
  purpose: 'login' | 'verification' | 'reset';
}

interface SMSResponse {
  success: boolean;
  code?: string;
  error?: string;
  message: string;
}

serve(async (req) => {
  try {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { phone, purpose }: SMSRequest = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // TODO: Later integrate with your SMS service here
    // For now, just return the code for testing
    
    console.log(`📱 [SMS] Generated code ${verificationCode} for ${phone} (${purpose})`);
    
    // In production, you would:
    // 1. Store the code in database with expiration
    // 2. Send via your SMS service
    // 3. Return success/failure
    
    const response: SMSResponse = {
      success: true,
      code: verificationCode, // Remove this in production
      message: `Verification code generated for ${phone}. Code: ${verificationCode} (for testing only)`
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('❌ [SMS] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: 'Failed to process SMS request'
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});
