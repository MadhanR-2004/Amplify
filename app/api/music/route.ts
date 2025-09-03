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
    const musicCollection = db.collection('music');

    // Get all music with pagination and enhanced data
    const music = await musicCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Transform the data to ensure compatibility with frontend
    const enhancedMusic = music.map(song => ({
      ...song,
      artists: song.artists || [],
      songType: song.songType || 'single',
      // Ensure backward compatibility
      artist: song.artist || 'Unknown Artist',
      album: song.album || 'Unknown Album'
    }));

    return NextResponse.json({
      success: true,
      music: enhancedMusic
    });

  } catch (error) {
    console.error('Music fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
