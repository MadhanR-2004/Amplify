import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/middleware';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid artist ID' },
        { status: 400 }
      );
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

    // Check if another artist with the same name exists (excluding current artist)
    const existingArtist = await artistsCollection.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: new ObjectId(id) }
    });

    if (existingArtist) {
      return NextResponse.json(
        { success: false, message: 'An artist with this name already exists' },
        { status: 409 }
      );
    }

    const updateData = {
      name: name.trim(),
      bio: bio?.trim() || '',
      imageUrl: imageUrl?.trim() || '/default-artist.jpg',
      genre: genre.map((g: string) => g.trim()),
      updatedAt: new Date(),
    };

    const result = await artistsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Artist not found' },
        { status: 404 }
      );
    }

    // Get the updated document
    const updatedArtist = await artistsCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Artist updated successfully',
      artist: updatedArtist
    });

  } catch (error) {
    console.error('Artist update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid artist ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const artistsCollection = db.collection('artists');

    const result = await artistsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Artist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Artist deleted successfully'
    });

  } catch (error) {
    console.error('Artist deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
