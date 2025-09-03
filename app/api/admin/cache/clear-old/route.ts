import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { clearOldCache } from '@/lib/cache-manager';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const deletedCount = clearOldCache(24); // Clear files older than 24 hours

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} old cached files`,
      deletedCount,
    });

  } catch (error) {
    console.error('Cache clear old error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear old cache' },
      { status: 500 }
    );
  }
}
