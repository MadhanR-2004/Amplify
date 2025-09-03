import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const db = await getDatabase();
    const artistsCollection = db.collection('artists');

    // Get all artists (public data only)
    const artists = await artistsCollection
      .find({})
      .sort({ createdAt: -1 })
      .project({
        _id: 1,
        name: 1,
        bio: 1,
        imageUrl: 1,
        genre: 1,
        albumIds: 1,
        songIds: 1,
        createdAt: 1
      })
      .toArray();

    return NextResponse.json({
      success: true,
      artists
    });

  } catch (error) {
    console.error('Artists fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
