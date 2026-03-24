import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  getSycapayUrls, 
  StatusResponse, 
  mapSycapayStatus,
  getStatusFromCode
} from '@/lib/sycapay';

interface StatusRequest {
  ref: string; // transactionId from SYCAPAY
}

// POST /api/sycapay/payment/status - Check transaction status from SYCAPAY
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as StatusRequest;
    const { ref } = body;

    // Validate required fields
    if (!ref) {
      return NextResponse.json(
        { error: 'Transaction reference (ref) is required' },
        { status: 400 }
      );
    }

    // Get SYCAPAY credentials from database
    const credentials = await db.sycapayCredential.findFirst({
      where: { isActive: true }
    });

    if (!credentials) {
      return NextResponse.json(
        { error: 'SYCAPAY credentials not configured' },
        { status: 400 }
      );
    }

    // Get URLs based on environment
    const urls = getSycapayUrls(credentials.environment as 'TEST' | 'PRODUCTION');

    console.log(`[SYCAPAY] Checking status - Ref: ${ref}`);

    // Make the status check request
    const response = await fetch(urls.status, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ref }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SYCAPAY] Status check failed: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Status check failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json() as StatusResponse;

    console.log(`[SYCAPAY] Status response:`, data);

    // Get the transaction ID (can be transactionId or transactionID)
    const transactionId = data.transactionId || data.transactionID;

    // Determine transaction status
    const statusInfo = getStatusFromCode(data.code);
    const mappedStatus = mapSycapayStatus(data.code);

    // Update transaction in database if it exists
    if (transactionId) {
      const existingTransaction = await db.paymentTransaction.findFirst({
        where: { 
          OR: [
            { transactionId: transactionId },
            { orderId: data.orderId || '' }
          ]
        }
      });

      if (existingTransaction) {
        await db.paymentTransaction.update({
          where: { id: existingTransaction.id },
          data: {
            status: mappedStatus,
            statusCode: data.code,
            statusMessage: data.message || statusInfo.description,
            paidAt: mappedStatus === 'SUCCESS' ? new Date() : existingTransaction.paidAt
          }
        });
      }
    }

    // Return status response
    if (data.code === 0) {
      return NextResponse.json({
        success: true,
        status: 'SUCCESS',
        message: data.message || 'Payment successful',
        transactionId: transactionId,
        orderId: data.orderId,
        amount: data.amount,
        mobile: data.mobile,
        operator: data.operator,
        date: data.date,
        paiementId: data.paiementId
      });
    } else if (data.code === -200 || data.code === -9) {
      // Pending status
      return NextResponse.json({
        success: true,
        status: 'PENDING',
        message: data.message || 'Transaction is pending',
        transactionId: transactionId,
        orderId: data.orderId,
        amount: data.amount,
        mobile: data.mobile,
        operator: data.operator,
        date: data.date,
        code: data.code
      });
    } else {
      // Failed or error status
      return NextResponse.json({
        success: false,
        status: 'FAILED',
        message: data.message || statusInfo.description,
        transactionId: transactionId,
        orderId: data.orderId,
        amount: data.amount,
        code: data.code
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[SYCAPAY] Status check error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Status check request timed out' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred while checking status' },
      { status: 500 }
    );
  }
}

// GET /api/sycapay/payment/status - Get status endpoint info
export async function GET(request: NextRequest) {
  // Also support querying local transaction by orderId
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get('orderId');
  const transactionId = searchParams.get('transactionId');

  if (orderId || transactionId) {
    try {
      const transaction = await db.paymentTransaction.findFirst({
        where: {
          OR: [
            { orderId: orderId || '' },
            { transactionId: transactionId || '' }
          ]
        }
      });

      if (!transaction) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id: transaction.id,
        orderId: transaction.orderId,
        transactionId: transaction.transactionId,
        paiementId: transaction.paiementId,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        statusCode: transaction.statusCode,
        statusMessage: transaction.statusMessage,
        customerPhone: transaction.customerPhone,
        operator: transaction.operator,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        paidAt: transaction.paidAt
      });
    } catch (error) {
      console.error('[SYCAPAY] Get transaction error:', error);
      return NextResponse.json(
        { error: 'Failed to get transaction' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    endpoint: 'status',
    method: 'POST',
    description: 'Check transaction status from SYCAPAY',
    requiredFields: ['ref (transactionId)'],
    localQuery: {
      method: 'GET',
      parameters: ['orderId', 'transactionId'],
      description: 'Query local transaction by orderId or transactionId'
    }
  });
}
