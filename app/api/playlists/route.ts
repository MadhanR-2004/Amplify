import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requireAuth } from '@/lib/middleware';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const db = await getDatabase();
    const playlistsCollection = db.collection('playlists');

    // Get user's playlists
    const playlists = await playlistsCollection
      .find({ userId: new ObjectId(authResult.user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      playlists
    });

  } catch (error) {
    console.error('Playlists fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const { name, description, isPublic } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Playlist name is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const playlistsCollection = db.collection('playlists');

    const newPlaylist = {
      userId: new ObjectId(authResult.user.userId),
      name,
      description: description || '',
      isPublic: isPublic || false,
      songs: [],
      createdAt: new Date(),
    };

    const result = await playlistsCollection.insertOne(newPlaylist);

    return NextResponse.json({
      success: true,
      message: 'Playlist created successfully',
      playlist: { _id: result.insertedId, ...newPlaylist }
    }, { status: 201 });

  } catch (error) {
    console.error('Playlist creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
