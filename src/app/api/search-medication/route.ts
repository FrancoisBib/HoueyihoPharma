import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const PLAYWRIGHT_SERVICE_PORT = 3002;
const CACHE_DURATION_MINUTES = 30;

interface SearchResult {
  success: boolean;
  medicationName: string;
  supplier: string;
  available: boolean;
  price: number | null;
  currency: string | null;
  deliveryTime: string | null;
  productUrl: string | null;
  error?: string;
  timestamp: string;
}

interface PlaywrightResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  timestamp: string;
}

// Check cache for recent search
async function getCachedResult(medicationName: string): Promise<SearchResult[] | null> {
  const normalizedName = medicationName.toLowerCase().trim();
  const now = new Date();
  
  const cached = await db.medicationCache.findMany({
    where: {
      normalizedName,
      expiresAt: {
        gt: now
      }
    },
    orderBy: {
      searchedAt: 'desc'
    }
  });

  if (cached.length > 0) {
    return cached.map(item => ({
      success: true,
      medicationName: item.medicationName,
      supplier: item.supplier,
      available: item.available,
      price: item.price,
      currency: item.currency,
      deliveryTime: item.deliveryTime,
      productUrl: item.productUrl,
      timestamp: item.searchedAt.toISOString()
    }));
  }

  return null;
}

// Save results to cache
async function saveToCache(medicationName: string, results: SearchResult[]): Promise<void> {
  const normalizedName = medicationName.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + CACHE_DURATION_MINUTES * 60 * 1000);

  for (const result of results) {
    if (result.success) {
      await db.medicationCache.create({
        data: {
          medicationName: result.medicationName,
          normalizedName,
          supplier: result.supplier,
          available: result.available,
          price: result.price,
          currency: result.currency,
          deliveryTime: result.deliveryTime,
          productUrl: result.productUrl,
          searchedAt: new Date(result.timestamp),
          expiresAt
        }
      });
    }
  }
}

// Save search history
async function saveSearchHistory(query: string, results: SearchResult[]): Promise<void> {
  await db.searchHistory.create({
    data: {
      query,
      results: JSON.stringify(results)
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { medicationName } = body;

    if (!medicationName || typeof medicationName !== 'string') {
      return NextResponse.json(
        { error: 'Medication name is required' },
        { status: 400 }
      );
    }

    const trimmedName = medicationName.trim();
    
    // Check cache first
    const cachedResults = await getCachedResult(trimmedName);
    
    if (cachedResults) {
      console.log(`[API] Returning cached results for: ${trimmedName}`);
      return NextResponse.json({
        success: true,
        query: trimmedName,
        results: cachedResults,
        timestamp: new Date().toISOString(),
        cached: true
      });
    }

    // Call Playwright service
    const playwrightUrl = new URL('/api/search', `http://localhost:${PLAYWRIGHT_SERVICE_PORT}`);

    console.log(`[API] Calling Playwright service for: ${trimmedName}`);
    
    const response = await fetch(playwrightUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ medicationName: trimmedName }),
      signal: AbortSignal.timeout(120000) // 2 minute timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[API] Playwright service error:', errorData);
      
      return NextResponse.json(
        { error: errorData.error || 'Failed to search medication' },
        { status: response.status }
      );
    }

    const data: PlaywrightResponse = await response.json();

    // Save to cache
    if (data.results.length > 0) {
      await saveToCache(trimmedName, data.results);
    }

    // Save search history
    await saveSearchHistory(trimmedName, data.results);

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Search error:', error);
    
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return NextResponse.json(
          { error: 'Search timed out. Please try again.' },
          { status: 504 }
        );
      }
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

// GET endpoint for search suggestions (optional)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  // Get recent searches for autocomplete
  const recentSearches = await db.searchHistory.findMany({
    where: {
      query: {
        contains: query.toLowerCase()
      }
    },
    distinct: ['query'],
    orderBy: {
      searchedAt: 'desc'
    },
    take: 5
  });

  return NextResponse.json({
    suggestions: recentSearches.map(s => s.query)
  });
}
