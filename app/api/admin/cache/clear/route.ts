import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { clearCache } from '@/lib/cache-manager';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const deletedCount = clearCache();

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} cached files`,
      deletedCount,
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
