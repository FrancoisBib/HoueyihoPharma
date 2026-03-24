import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/orders - Get all orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const where = status ? { status } : {};

    const orders = await db.order.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    // Also get payment transactions for these orders
    const ordersWithPayments = await Promise.all(
      orders.map(async (order) => {
        let payment: { status: string; statusMessage: string | null; paidAt: Date | null } | null = null;
        if (order.transactionId) {
          const tx = await db.paymentTransaction.findFirst({
            where: {
              OR: [
                { transactionId: order.transactionId },
                { orderId: order.orderNumber }
              ]
            }
          });
          if (tx) {
            payment = {
              status: tx.status,
              statusMessage: tx.statusMessage,
              paidAt: tx.paidAt
            };
          }
        }
        
        return {
          ...order,
          items: JSON.parse(order.items || '[]'),
          payment
        };
      })
    );

    return NextResponse.json({
      orders: ordersWithPayments,
      total: orders.length
    });
  } catch (error) {
    console.error('[API] Get orders error:', error);
    return NextResponse.json(
      { error: 'Failed to get orders' },
      { status: 500 }
    );
  }
}
