import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  getSycapayUrls, 
  formatPhoneNumber, 
  PaymentResponse, 
  generateOrderNumber,
  mapSycapayStatus,
  getStatusFromCode,
  MOBILE_MONEY_OPERATORS
} from '@/lib/sycapay';

// Allowed operators for Benin only
const ALLOWED_OPERATORS = MOBILE_MONEY_OPERATORS['BJ'];

interface CheckoutRequest {
  token: string;
  amount: number;
  currency?: string;
  telephone: string;
  name?: string;
  pname?: string;
  orderId?: string;
  operator: string;
  notifyUrl?: string;
}

// POST /api/sycapay/payment/checkout - Process payment via SYCAPAY
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CheckoutRequest;
    const { 
      token, 
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
    if (!token) {
      return NextResponse.json(
        { error: 'Token is required. Please authenticate first.' },
        { status: 400 }
      );
    }

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
    const dbCredentials = await db.sycapayCredential.findFirst({
      where: { isActive: true }
    });

    // Fallback to environment variables if not in database
    let credentials: {
      merchantId: string;
      apiKey: string;
      environment: string;
      country: string;
    };

    if (dbCredentials) {
      credentials = dbCredentials;
    } else {
      const envMerchantId = process.env.SYCAPAY_MERCHANT_ID;
      const envApiKey = process.env.SYCAPAY_API_KEY;
      const envEnvironment = process.env.SYCAPAY_ENVIRONMENT || 'TEST';
      const envCountry = process.env.SYCAPAY_COUNTRY || 'BJ';

      if (!envMerchantId || !envApiKey) {
        return NextResponse.json(
          { error: 'SYCAPAY credentials not configured' },
          { status: 400 }
        );
      }

      credentials = {
        merchantId: envMerchantId,
        apiKey: envApiKey,
        environment: envEnvironment,
        country: envCountry
      };
    }

    // Generate order number if not provided
    const orderNumber = orderId || generateOrderNumber();

    // Format phone number
    const formattedPhone = formatPhoneNumber(telephone, credentials.country);

    // Get URLs based on environment
    const urls = getSycapayUrls(credentials.environment as 'TEST' | 'PRODUCTION');

    console.log(`[SYCAPAY] Processing payment - Order: ${orderNumber}, Amount: ${amount}, Operator: ${operator}, Phone: ${formattedPhone}`);

    // Prepare the checkout request
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

    // Make the checkout request
    const response = await fetch(urls.checkout, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData),
      signal: AbortSignal.timeout(60000) // 60 second timeout for payment processing
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SYCAPAY] Checkout request failed: ${response.status} - ${errorText}`);
      
      // Store failed transaction in database
      await db.paymentTransaction.create({
        data: {
          orderId: orderNumber,
          amount: amount,
          currency: currency,
          status: 'FAILED',
          statusCode: response.status,
          statusMessage: `HTTP Error: ${response.status}`,
          customerPhone: formattedPhone,
          customerName: name,
          customerPName: pname,
          operator: operator,
          operatorToken: token,
          notifyUrl: notifyUrl
        }
      });

      return NextResponse.json(
        { error: `Payment request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json() as PaymentResponse;

    console.log(`[SYCAPAY] Checkout response:`, data);

    // Determine transaction status
    const statusInfo = getStatusFromCode(data.code);
    const mappedStatus = mapSycapayStatus(data.code);

    // Store transaction in database
    const transaction = await db.paymentTransaction.create({
      data: {
        orderId: orderNumber,
        transactionId: data.transactionId || null,
        paiementId: data.paiementId || null,
        amount: parseFloat(data.amount || amount.toString()),
        currency: currency,
        status: mappedStatus,
        statusCode: data.code,
        statusMessage: data.message || statusInfo.description,
        customerPhone: formattedPhone,
        customerName: name,
        customerPName: pname,
        operator: data.operator || operator,
        operatorToken: token,
        notifyUrl: notifyUrl,
        paidAt: mappedStatus === 'SUCCESS' ? new Date() : null
      }
    });

    // Return response based on SYCAPAY result
    if (data.code === 0) {
      return NextResponse.json({
        success: true,
        message: 'Payment initiated successfully',
        transactionId: data.transactionId,
        orderId: data.orderId,
        amount: data.amount,
        operator: data.operator,
        status: 'PENDING',
        statusMessage: 'Transaction sent. Awaiting customer confirmation.',
        transaction: {
          id: transaction.id,
          orderId: transaction.orderId,
          status: transaction.status
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: statusInfo.description,
        code: data.code,
        message: data.message,
        transactionId: data.transactionId,
        orderId: data.orderId,
        transaction: {
          id: transaction.id,
          orderId: transaction.orderId,
          status: transaction.status
        }
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[SYCAPAY] Checkout error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Payment request timed out' },
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

// GET /api/sycapay/payment/checkout - Get payment checkout endpoint info
export async function GET() {
  return NextResponse.json({
    endpoint: 'checkout',
    method: 'POST',
    requiredFields: [
      'token (from authentication)',
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
    supportedOperators: {
      BJ: ['MtnBJ', 'MoovBJ', 'CeltisBJ']
    },
    note: 'Payments are only available for Benin'
  });
}
