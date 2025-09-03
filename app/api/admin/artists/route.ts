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
    const artistsCollection = db.collection('artists');

    const artists = await artistsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      artists
    });

  } catch (error) {
    console.error('Admin artists fetch error:', error);
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
    const { name, bio, imageUrl, genre } = body;

    // Validation
    if (!name || !genre || !Array.isArray(genre) || genre.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Artist name and at least one genre are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const artistsCollection = db.collection('artists');

    // Check if artist already exists
    const existingArtist = await artistsCollection.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingArtist) {
      return NextResponse.json(
        { success: false, message: 'An artist with this name already exists' },
        { status: 409 }
      );
    }

    const newArtist = {
      name: name.trim(),
      bio: bio?.trim() || '',
      imageUrl: imageUrl?.trim() || '/default-artist.jpg',
      genre: genre.map((g: string) => g.trim()),
      albumIds: [],
      songIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await artistsCollection.insertOne(newArtist);

    return NextResponse.json({
      success: true,
      message: 'Artist created successfully',
      artist: { _id: result.insertedId, ...newArtist }
    }, { status: 201 });

  } catch (error) {
    console.error('Artist creation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
