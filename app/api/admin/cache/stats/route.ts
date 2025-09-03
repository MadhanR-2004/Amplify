import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { getCacheStats } from '@/lib/cache-manager';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const stats = getCacheStats();

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error('Cache stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}
