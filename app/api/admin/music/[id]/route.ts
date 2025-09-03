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
        { success: false, message: 'Invalid music ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      artist,
      album,
      songType,
      genre,
      duration,
      thumbnailUrl,
      fileUrl,
      tags,
      artistId,
      albumId,
      artists
    } = body;

    // Handle genre as array
    let genreArray: string[] = [];
    if (Array.isArray(genre)) {
      genreArray = genre.filter((g: string) => g && g.trim().length > 0);
    } else if (typeof genre === 'string' && genre.trim()) {
      genreArray = [genre.trim()];
    }

    // Validation
    if (!title || !artist || genreArray.length === 0 || !duration) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const musicCollection = db.collection('music');

    const updateData: any = {
      title,
      artist,
      album: album || '',
      songType: songType || 'single',
      genre: genreArray,
      duration: parseInt(duration.toString()),
      thumbnailUrl: thumbnailUrl || '/default-thumbnail.svg',
      tags: tags || [],
      artists: Array.isArray(artists) ? artists.map((a: any) => ({
        id: a.id || '',
        name: a.name.trim(),
        role: a.role || 'featured'
      })) : [],
      updatedAt: new Date(),
    };

    // Only update fileUrl if a new one is provided
    if (fileUrl) {
      updateData.fileUrl = fileUrl;
    }

    // Add artistId and albumId if provided
    if (artistId) {
      updateData.artistId = artistId;
    }
    if (albumId) {
      updateData.albumId = albumId;
    }

    const result = await musicCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Music not found' },
        { status: 404 }
      );
    }

    // Get the updated document
    const updatedMusic = await musicCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Music updated successfully',
      music: updatedMusic
    });

  } catch (error) {
    console.error('Music update error:', error);
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
        { success: false, message: 'Invalid music ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const musicCollection = db.collection('music');

    const result = await musicCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Music not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Music deleted successfully'
    });

  } catch (error) {
    console.error('Music deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
