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
    
    // Get document counts from each collection
    const [
      totalSongs,
      totalArtists, 
      totalAlbums,
      totalPlaylists
    ] = await Promise.all([
      db.collection('music').countDocuments({ isActive: { $ne: false } }),
      db.collection('artists').countDocuments(),
      db.collection('albums').countDocuments(),
      db.collection('playlists').countDocuments()
    ]);

    // Get favorites count for the current user
    // Since favorites feature is not implemented yet, return 0
    const favoritesCount = 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalSongs,
        totalArtists,
        totalAlbums,
        totalPlaylists,
        favorites: favoritesCount
      }
    });

  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
