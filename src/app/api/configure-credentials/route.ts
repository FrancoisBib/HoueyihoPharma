import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const PLAYWRIGHT_SERVICE_PORT = 3002;

interface CredentialConfig {
  supplier: string;
  username: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CredentialConfig;
    const { supplier, username, password } = body;

    if (!supplier || !username || !password) {
      return NextResponse.json(
        { error: 'Supplier, username, and password are required' },
        { status: 400 }
      );
    }

    const validSuppliers = ['laborex', 'ubipharm'];
    if (!validSuppliers.includes(supplier.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid supplier. Must be "laborex" or "ubipharm"' },
        { status: 400 }
      );
    }

    const supplierName = supplier.toLowerCase();
    
    // Store credentials in database (in production, encrypt the password)
    const loginUrl = supplierName === 'laborex' 
      ? 'https://www.laborex-benin.com/fr/login'
      : 'https://client-benin.ubipharm.com/Identification';

    // Upsert credentials
    await db.supplierCredential.upsert({
      where: { supplier: supplierName },
      create: {
        supplier: supplierName,
        username,
        password, // In production, this should be encrypted
        loginUrl,
        isActive: true
      },
      update: {
        username,
        password, // In production, this should be encrypted
        loginUrl,
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Also forward to Playwright service for immediate use
    try {
      const playwrightUrl = new URL('/api/config', 'http://localhost');
      playwrightUrl.searchParams.set('XTransformPort', PLAYWRIGHT_SERVICE_PORT.toString());

      await fetch(playwrightUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ supplier: supplierName, username, password }),
        signal: AbortSignal.timeout(10000)
      });
    } catch (error) {
      console.warn('[API] Could not forward credentials to Playwright service:', error);
      // Continue anyway - credentials are saved in DB
    }

    console.log(`[API] Credentials configured for: ${supplierName}`);

    return NextResponse.json({
      success: true,
      message: `Credentials configured for ${supplierName}`,
      supplier: supplierName
    });
  } catch (error) {
    console.error('[API] Configure credentials error:', error);
    
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

// GET endpoint to check credential status
export async function GET() {
  try {
    const credentials = await db.supplierCredential.findMany({
      select: {
        supplier: true,
        username: true,
        isActive: true,
        lastUsed: true
      }
    });

    return NextResponse.json({
      suppliers: credentials.map(c => ({
        supplier: c.supplier,
        configured: true,
        username: c.username,
        isActive: c.isActive,
        lastUsed: c.lastUsed
      }))
    });
  } catch (error) {
    console.error('[API] Get credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to get credentials' },
      { status: 500 }
    );
  }
}
