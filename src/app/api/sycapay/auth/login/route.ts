import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSycapayUrls, formatPhoneNumber, AuthResponse } from '@/lib/sycapay';

interface LoginRequest {
  amount: number;
  currency?: string;
  operator?: string;
}

// POST /api/sycapay/auth/login - Get authentication token from SYCAPAY
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as LoginRequest;
    const { amount, currency = 'XOF', operator } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Get SYCAPAY credentials from database
    const credentials = await db.sycapayCredential.findFirst({
      where: { isActive: true }
    });

    if (!credentials) {
      return NextResponse.json(
        { error: 'SYCAPAY credentials not configured. Please configure merchant credentials first.' },
        { status: 400 }
      );
    }

    // Get URLs based on environment
    const urls = getSycapayUrls(credentials.environment as 'TEST' | 'PRODUCTION');

    console.log(`[SYCAPAY] Authenticating - Environment: ${credentials.environment}, Amount: ${amount}, Currency: ${currency}`);

    // Prepare the request
    const headers = {
      'X-SYCA-MERCHANDID': credentials.merchantId,
      'X-SYCA-APIKEY': credentials.apiKey,
      'X-SYCA-REQUEST-DATA-FORMAT': 'JSON',
      'X-SYCA-RESPONSE-DATA-FORMAT': 'JSON',
      'Content-Type': 'application/json'
    };

    const requestBody = {
      montant: amount.toString(),
      currency: currency
    };

    // Make the authentication request
    const response = await fetch(urls.auth, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SYCAPAY] Auth request failed: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Authentication failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json() as AuthResponse;

    console.log(`[SYCAPAY] Auth response:`, data);

    // Check if authentication was successful
    if (data.code !== 0) {
      return NextResponse.json(
        { 
          error: 'Authentication failed', 
          code: data.code,
          message: data.desc || 'Unknown error'
        },
        { status: 400 }
      );
    }

    // Return the token (note: token is only valid for 40 seconds)
    return NextResponse.json({
      success: true,
      token: data.token,
      amount: data.amount,
      expiresIn: 40, // seconds
      message: 'Token generated successfully. Use it within 40 seconds.'
    });

  } catch (error) {
    console.error('[SYCAPAY] Auth error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Authentication request timed out' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred during authentication' },
      { status: 500 }
    );
  }
}

// GET /api/sycapay/auth/login - Check auth endpoint status
export async function GET() {
  try {
    // Get SYCAPAY credentials status
    const credentials = await db.sycapayCredential.findFirst({
      where: { isActive: true }
    });

    if (!credentials) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'SYCAPAY credentials not configured'
      });
    }

    return NextResponse.json({
      status: 'configured',
      environment: credentials.environment,
      merchantId: credentials.merchantId,
      country: credentials.country
    });
  } catch (error) {
    console.error('[SYCAPAY] Auth check error:', error);
    return NextResponse.json(
      { error: 'Failed to check SYCAPAY status' },
      { status: 500 }
    );
  }
}
