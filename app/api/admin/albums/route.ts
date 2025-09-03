import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/middleware';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const db = await getDatabase();
    const albumsCollection = db.collection('albums');

    // Get albums without artist lookup for faster loading
    // Frontend will handle artist name mapping
    const albums = await albumsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      albums
    });

  } catch (error) {
    console.error('Admin albums fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const body = await request.json();
    const { title, artistId, description, coverUrl, releaseDate, genre } = body;

    // Validation
    if (!title || !artistId || !genre || !Array.isArray(genre) || genre.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Album title, artist, and at least one genre are required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(artistId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid artist ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const albumsCollection = db.collection('albums');
    const artistsCollection = db.collection('artists');

    // Verify artist exists
    const artist = await artistsCollection.findOne({ _id: new ObjectId(artistId) });
    if (!artist) {
      return NextResponse.json(
        { success: false, message: 'Artist not found' },
        { status: 404 }
      );
    }

    // Check if album already exists for this artist
    const existingAlbum = await albumsCollection.findOne({ 
      title: { $regex: new RegExp(`^${title.trim()}$`, 'i') },
      artistId: new ObjectId(artistId)
    });

    if (existingAlbum) {
      return NextResponse.json(
        { success: false, message: 'An album with this title already exists for this artist' },
        { status: 409 }
      );
    }

    const newAlbum = {
      title: title.trim(),
      artistId: new ObjectId(artistId),
      artistName: artist.name,
      description: description?.trim() || '',
      coverUrl: coverUrl?.trim() || '/default-album.jpg',
      releaseDate: releaseDate ? new Date(releaseDate) : new Date(),
      genre: genre.map((g: string) => g.trim()),
      songIds: [],
      duration: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await albumsCollection.insertOne(newAlbum);

    // Update artist's albumIds
    await artistsCollection.updateOne(
      { _id: new ObjectId(artistId) },
      { 
        $push: { albumIds: result.insertedId } as any,
        $set: { updatedAt: new Date() }
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Album created successfully',
      album: { _id: result.insertedId, ...newAlbum }
    }, { status: 201 });

  } catch (error) {
    console.error('Album creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
