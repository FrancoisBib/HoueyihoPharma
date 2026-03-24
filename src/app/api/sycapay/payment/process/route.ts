import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  getSycapayUrls, 
  formatPhoneNumber, 
  PaymentResponse, 
  generateOrderNumber,
  mapSycapayStatus,
  getStatusFromCode,
  AuthResponse,
  MOBILE_MONEY_OPERATORS
} from '@/lib/sycapay';

// Allowed operators for Benin only
const ALLOWED_OPERATORS = MOBILE_MONEY_OPERATORS['BJ'];

interface ProcessPaymentRequest {
  amount: number;
  currency?: string;
  telephone: string;
  name?: string;
  pname?: string;
  orderId?: string;
  operator: string;
  notifyUrl?: string;
}

// POST /api/sycapay/payment/process - Complete payment flow (auth + checkout)
export async function POST(request: NextRequest) {
  let credentials: any = null;
  let urls: any = null;

  try {
    const body = await request.json() as ProcessPaymentRequest;
    const { 
      amount, 
      telephone, 
      name = '', 
      pname = '', 
      orderId,
      operator,
      notifyUrl = '',
      currency = 'XOF'
    } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    if (!telephone) {
      return NextResponse.json(
        { error: 'Telephone number is required' },
        { status: 400 }
      );
    }

    if (!operator) {
      return NextResponse.json(
        { error: 'Mobile money operator is required (e.g., MtnBJ, MoovBJ, CeltisBJ)' },
        { status: 400 }
      );
    }

    // Validate operator is from Benin only
    if (!ALLOWED_OPERATORS.includes(operator)) {
      return NextResponse.json(
        { error: `Payment is only available for Benin operators: ${ALLOWED_OPERATORS.join(', ')}` },
        { status: 400 }
      );
    }

    // Get SYCAPAY credentials from database or environment variables
    credentials = await db.sycapayCredential.findFirst({
      where: { isActive: true }
    });

    // Fallback to environment variables if not in database
    if (!credentials) {
      const envMerchantId = process.env.SYCAPAY_MERCHANT_ID;
      const envApiKey = process.env.SYCAPAY_API_KEY;
      const envEnvironment = process.env.SYCAPAY_ENVIRONMENT || 'TEST';
      const envCountry = process.env.SYCAPAY_COUNTRY || 'BJ';

      if (!envMerchantId || !envApiKey) {
        return NextResponse.json(
          { error: 'SYCAPAY credentials not configured. Please configure merchant credentials first.' },
          { status: 400 }
        );
      }

      credentials = {
        merchantId: envMerchantId,
        apiKey: envApiKey,
        environment: envEnvironment,
        country: envCountry,
        isActive: true
      };
    }

    // Get URLs based on environment
    urls = getSycapayUrls(credentials.environment as 'TEST' | 'PRODUCTION');

    // Generate order number if not provided
    const orderNumber = orderId || generateOrderNumber();

    // Format phone number
    const formattedPhone = formatPhoneNumber(telephone, credentials.country);

    console.log(`[SYCAPAY] Processing complete payment - Order: ${orderNumber}, Amount: ${amount}, Operator: ${operator}`);

    // Step 1: Authenticate to get token
    const authHeaders = {
      'X-SYCA-MERCHANDID': credentials.merchantId,
      'X-SYCA-APIKEY': credentials.apiKey,
      'X-SYCA-REQUEST-DATA-FORMAT': 'JSON',
      'X-SYCA-RESPONSE-DATA-FORMAT': 'JSON',
      'Content-Type': 'application/json'
    };

    const authResponse = await fetch(urls.auth, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        montant: amount.toString(),
        currency: currency
      }),
      signal: AbortSignal.timeout(30000)
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error(`[SYCAPAY] Auth failed: ${authResponse.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Authentication failed: ${authResponse.status}` },
        { status: authResponse.status }
      );
    }

    const authData = await authResponse.json() as AuthResponse;

    if (authData.code !== 0 || !authData.token) {
      console.error(`[SYCAPAY] Auth error:`, authData);
      return NextResponse.json(
        { 
          error: 'Authentication failed', 
          code: authData.code,
          message: authData.desc || 'Failed to get payment token'
        },
        { status: 400 }
      );
    }

    console.log(`[SYCAPAY] Got token, proceeding to checkout`);
    const token = authData.token;

    // Step 2: Process payment with token
    const checkoutData = {
      marchandid: credentials.merchantId,
      token: token,
      telephone: formattedPhone,
      name: name,
      pname: pname,
      urlnotif: notifyUrl,
      montant: amount.toString(),
      currency: currency,
      numcommande: orderNumber,
      pays: credentials.country,
      operateurs: operator
    };

    const checkoutResponse = await fetch(urls.checkout, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData),
      signal: AbortSignal.timeout(60000)
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error(`[SYCAPAY] Checkout failed: ${checkoutResponse.status} - ${errorText}`);
      
      // Store failed transaction
      await db.paymentTransaction.create({
        data: {
          orderId: orderNumber,
          amount: amount,
          currency: currency,
          status: 'FAILED',
          statusCode: checkoutResponse.status,
          statusMessage: `HTTP Error: ${checkoutResponse.status}`,
          customerPhone: formattedPhone,
          customerName: name,
          customerPName: pname,
          operator: operator,
          operatorToken: token,
          notifyUrl: notifyUrl
        }
      });

      return NextResponse.json(
        { error: `Payment failed: ${checkoutResponse.status}` },
        { status: checkoutResponse.status }
      );
    }

    const checkoutDataResponse = await checkoutResponse.json() as PaymentResponse;

    console.log(`[SYCAPAY] Checkout response:`, checkoutDataResponse);

    // Determine transaction status
    const statusInfo = getStatusFromCode(checkoutDataResponse.code);
    const mappedStatus = mapSycapayStatus(checkoutDataResponse.code);

    // Store transaction in database
    const transaction = await db.paymentTransaction.create({
      data: {
        orderId: orderNumber,
        transactionId: checkoutDataResponse.transactionId || null,
        paiementId: checkoutDataResponse.paiementId || null,
        amount: parseFloat(checkoutDataResponse.amount || amount.toString()),
        currency: currency,
        status: mappedStatus,
        statusCode: checkoutDataResponse.code,
        statusMessage: checkoutDataResponse.message || statusInfo.description,
        customerPhone: formattedPhone,
        customerName: name,
        customerPName: pname,
        operator: checkoutDataResponse.operator || operator,
        operatorToken: token,
        notifyUrl: notifyUrl,
        paidAt: mappedStatus === 'SUCCESS' ? new Date() : null
      }
    });

    // Return final response
    if (checkoutDataResponse.code === 0) {
      return NextResponse.json({
        success: true,
        message: 'Payment initiated successfully',
        transactionId: checkoutDataResponse.transactionId,
        orderId: checkoutDataResponse.orderId || orderNumber,
        amount: checkoutDataResponse.amount,
        operator: checkoutDataResponse.operator,
        status: 'PENDING',
        statusMessage: 'Transaction sent. Awaiting customer confirmation on mobile.',
        instructions: [
          `Un paiement de ${checkoutDataResponse.amount || amount} ${currency} vous a été demandé.`,
          `Vérifiez et approuvez le paiement sur votre mobile.`,
          `Le statut sera automatiquement mis à jour.`
        ]
      });
    } else {
      return NextResponse.json({
        success: false,
        error: statusInfo.description,
        code: checkoutDataResponse.code,
        message: checkoutDataResponse.message,
        transactionId: checkoutDataResponse.transactionId,
        orderId: checkoutDataResponse.orderId || orderNumber
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[SYCAPAY] Process payment error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Payment request timed out. Please try again.' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred during payment' },
      { status: 500 }
    );
  }
}

// GET /api/sycapay/payment/process - Get payment process info
export async function GET() {
  return NextResponse.json({
    endpoint: 'process',
    method: 'POST',
    description: 'Complete payment flow (authentication + checkout in one call)',
    requiredFields: [
      'amount',
      'telephone',
      'operator (e.g., MtnBJ, MoovBJ, CeltisBJ)'
    ],
    optionalFields: [
      'name',
      'pname',
      'orderId',
      'notifyUrl',
      'currency'
    ],
    workflow: [
      '1. Authenticate with SYCAPAY to get token (valid 40 seconds)',
      '2. Process payment with token',
      '3. Store transaction in database',
      '4. Return payment result'
    ],
    supportedOperators: {
      BJ: ['MtnBJ', 'MoovBJ', 'CeltisBJ']
    },
    note: 'Payments are only available for Benin'
  });
}
