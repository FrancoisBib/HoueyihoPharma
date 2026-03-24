import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface SycapayCredentialInput {
  merchantId: string;
  apiKey: string;
  environment?: 'TEST' | 'PRODUCTION';
  country?: string;
}

// Get credentials from database or environment variables
async function getCredentials() {
  // First try to get from database
  const dbCredentials = await db.sycapayCredential.findFirst({
    where: { isActive: true }
  });

  if (dbCredentials) {
    return {
      merchantId: dbCredentials.merchantId,
      apiKey: dbCredentials.apiKey,
      environment: dbCredentials.environment,
      country: dbCredentials.country
    };
  }

  // Fallback to environment variables
  const envMerchantId = process.env.SYCAPAY_MERCHANT_ID;
  const envApiKey = process.env.SYCAPAY_API_KEY;
  const envEnvironment = process.env.SYCAPAY_ENVIRONMENT || 'TEST';
  const envCountry = process.env.SYCAPAY_COUNTRY || 'BJ';

  if (envMerchantId && envApiKey) {
    return {
      merchantId: envMerchantId,
      apiKey: envApiKey,
      environment: envEnvironment as 'TEST' | 'PRODUCTION',
      country: envCountry
    };
  }

  return null;
}

// GET endpoint to get SYCAPAY credentials
export async function GET() {
  try {
    const credentials = await getCredentials();

    if (!credentials) {
      return NextResponse.json({
        configured: false,
        message: 'SYCAPAY credentials not configured'
      });
    }

    return NextResponse.json({
      configured: true,
      merchantId: credentials.merchantId,
      environment: credentials.environment,
      country: credentials.country,
      // Don't return the API key for security
      hasApiKey: !!credentials.apiKey
    });
  } catch (error) {
    console.error('[SYCAPAY] Get credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to get SYCAPAY credentials' },
      { status: 500 }
    );
  }
}

// POST endpoint to configure SYCAPAY credentials
export async function POST(request: NextRequest) {
  try {
    // Check if there's a JSON body
    const contentType = request.headers.get('content-type');
    
    let merchantId: string;
    let apiKey: string;
    let environment: 'TEST' | 'PRODUCTION' = 'TEST';
    let country: string = 'BJ';

    if (contentType?.includes('application/json')) {
      const body = await request.json() as SycapayCredentialInput;
      merchantId = body.merchantId;
      apiKey = body.apiKey;
      environment = body.environment || 'TEST';
      country = body.country || 'BJ';
    } else {
      // Use environment variables if no body provided
      merchantId = process.env.SYCAPAY_MERCHANT_ID || '';
      apiKey = process.env.SYCAPAY_API_KEY || '';
      environment = (process.env.SYCAPAY_ENVIRONMENT as 'TEST' | 'PRODUCTION') || 'TEST';
      country = process.env.SYCAPAY_COUNTRY || 'BJ';
    }

    if (!merchantId || !apiKey) {
      return NextResponse.json(
        { error: 'Merchant ID and API Key are required' },
        { status: 400 }
      );
    }

    // Validate environment
    if (!['TEST', 'PRODUCTION'].includes(environment)) {
      return NextResponse.json(
        { error: 'Invalid environment. Must be TEST or PRODUCTION' },
        { status: 400 }
      );
    }

    // Validate country - Only Benin is supported for payments
    const validCountries = ['BJ'];
    if (!validCountries.includes(country)) {
      return NextResponse.json(
        { error: `Payments are only available for Benin. Country must be: BJ` },
        { status: 400 }
      );
    }

    // Upsert credentials
    const credentials = await db.sycapayCredential.upsert({
      where: { merchantId },
      create: {
        merchantId,
        apiKey,
        environment,
        country,
        isActive: true
      },
      update: {
        apiKey,
        environment,
        country,
        isActive: true,
        updatedAt: new Date()
      }
    });

    console.log(`[SYCAPAY] Credentials configured for merchant: ${merchantId}, environment: ${environment}`);

    return NextResponse.json({
      success: true,
      message: 'SYCAPAY credentials configured successfully',
      merchantId: credentials.merchantId,
      environment: credentials.environment,
      country: credentials.country
    });
  } catch (error) {
    console.error('[SYCAPAY] Configure credentials error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove SYCAPAY credentials
export async function DELETE() {
  try {
    await db.sycapayCredential.deleteMany({
      where: { isActive: true }
    });

    return NextResponse.json({
      success: true,
      message: 'SYCAPAY credentials removed'
    });
  } catch (error) {
    console.error('[SYCAPAY] Delete credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to delete SYCAPAY credentials' },
      { status: 500 }
    );
  }
}
