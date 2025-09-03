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
        { success: false, message: 'Invalid album ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, artistId, description, coverUrl, releaseDate, genre } = body;

    // Validation
    if (!title || !artistId || !releaseDate || !genre || !Array.isArray(genre) || genre.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Title, artist, release date, and at least one genre are required' },
        { status: 400 }
      );
    }

    // Validate artistId
    if (!ObjectId.isValid(artistId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid artist ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const albumsCollection = db.collection('albums');
    const artistsCollection = db.collection('artists');

    // Check if artist exists
    const artist = await artistsCollection.findOne({ _id: new ObjectId(artistId) });
    if (!artist) {
      return NextResponse.json(
        { success: false, message: 'Artist not found' },
        { status: 404 }
      );
    }

    const updateData = {
      title: title.trim(),
      artistId: artistId,
      artistName: artist.name,
      description: description?.trim() || '',
      coverUrl: coverUrl?.trim() || '/default-album.jpg',
      releaseDate: releaseDate,
      genre: genre.map((g: string) => g.trim()),
      updatedAt: new Date(),
    };

    const result = await albumsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Album not found' },
        { status: 404 }
      );
    }

    // Get the updated document
    const updatedAlbum = await albumsCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: 'Album updated successfully',
      album: updatedAlbum
    });

  } catch (error) {
    console.error('Album update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const { id } = params;
    const body = await request.json();
    const { action, songId } = body;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid album ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const albumsCollection = db.collection('albums');

    let updateResult;

    if (action === 'addSong' && songId) {
      if (!ObjectId.isValid(songId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid song ID' },
          { status: 400 }
        );
      }

      // Add song to album's songIds array
      updateResult = await albumsCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $addToSet: { songIds: new ObjectId(songId) },
          $set: { updatedAt: new Date() }
        }
      );

      // Also update the artist's songIds if the album has an artist
      const album = await albumsCollection.findOne({ _id: new ObjectId(id) });
      if (album && album.artistId) {
        const artistsCollection = db.collection('artists');
        await artistsCollection.updateOne(
          { _id: new ObjectId(album.artistId) },
          { 
            $addToSet: { songIds: new ObjectId(songId) },
            $set: { updatedAt: new Date() }
          }
        );
      }

    } else if (action === 'removeSong' && songId) {
      if (!ObjectId.isValid(songId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid song ID' },
          { status: 400 }
        );
      }

      // Remove song from album's songIds array
      updateResult = await albumsCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $pull: { songIds: new ObjectId(songId) } as any,
          $set: { updatedAt: new Date() }
        }
      );

    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action or missing songId' },
        { status: 400 }
      );
    }

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Album not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Song ${action === 'addSong' ? 'added to' : 'removed from'} album successfully`
    });

  } catch (error) {
    console.error('Album update error:', error);
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
        { success: false, message: 'Invalid album ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const albumsCollection = db.collection('albums');

    const deleteResult = await albumsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Album not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Album deleted successfully'
    });

  } catch (error) {
    console.error('Album deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
