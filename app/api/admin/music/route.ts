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
    const musicCollection = db.collection('music');

    const music = await musicCollection
      .find({})
      .sort({ createdAt: -1 })
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
    console.error('Admin music fetch error:', error);
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
    console.log('Received music upload data:', body);
    
    const { title, artist, album, songType, genre, duration, thumbnailUrl, fileUrl, tags, artistId, albumId, artists } = body;

    // Log individual fields for debugging
    console.log('Validation check:', {
      title: !!title,
      artist: !!artist, 
      album: !!album,
      songType: !!songType,
      genre: !!genre,
      duration: !!duration,
      fileUrl: !!fileUrl,
      artistId: !!artistId,
      albumId: !!albumId,
      artists: Array.isArray(artists) ? artists.length : 'not array'
    });

    // Handle genre as array (store as array in database)
    let genreArray: string[] = [];
    if (Array.isArray(genre)) {
      genreArray = genre.filter((g: string) => g && g.trim() !== '');
    } else if (typeof genre === 'string' && genre.trim()) {
      genreArray = [genre.trim()];
    }

    // Validation
    if (!title || !artist || !songType || genreArray.length === 0 || !duration || !fileUrl) {
      console.log('Validation failed - missing required fields');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Title, artist, song type, genre, duration, and file URL are required',
          received: { title, artist, songType, genre: genreArray, duration, fileUrl }
        },
        { status: 400 }
      );
    }

    // Validate album is required for album tracks
    if (songType === 'album' && !album) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Album is required for album tracks',
        },
        { status: 400 }
      );
    }

    // Validate song type
    if (!['album', 'single'].includes(songType)) {
      return NextResponse.json(
        { success: false, message: 'Song type must be either "album" or "single"' },
        { status: 400 }
      );
    }

    // Validate duration is a positive number
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      return NextResponse.json(
        { success: false, message: 'Duration must be a positive number in seconds' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const musicCollection = db.collection('music');
    const artistsCollection = db.collection('artists');
    const albumsCollection = db.collection('albums');

    // Check if song with same title and artist already exists
    const existingSong = await musicCollection.findOne({ 
      title: title.trim(), 
      artist: artist.trim() 
    });

    if (existingSong) {
      return NextResponse.json(
        { success: false, message: 'A song with this title and artist already exists' },
        { status: 409 }
      );
    }

    const newMusic = {
      title: title.trim(),
      artist: artist.trim(),
      artists: Array.isArray(artists) ? artists.map((a: any) => ({
        id: a.id || '',
        name: a.name.trim(),
        role: a.role || 'featured'
      })) : [],
      album: songType === 'album' ? album.trim() : '',
      albumId: songType === 'album' && albumId ? new ObjectId(albumId) : undefined,
      songType: songType,
      artistId: artistId ? new ObjectId(artistId) : undefined,
      genre: genreArray,
      duration: durationNum,
      thumbnailUrl: thumbnailUrl || '/default-thumbnail.png',
      fileUrl: fileUrl.trim(),
      tags: tags ? tags.map((tag: string) => tag.trim()) : [],
      uploadedBy: new ObjectId(authResult.user.userId),
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      plays: 0,
      isActive: true,
    };

    const result = await musicCollection.insertOne(newMusic);

    // Update artist records with new relationship structure
    if (artistId) {
      const songRelation = {
        songId: result.insertedId,
        role: 'primary' as const,
        songType: songType as 'album' | 'single',
        albumId: albumId ? new ObjectId(albumId) : undefined
      };
      
      await artistsCollection.updateOne(
        { _id: new ObjectId(artistId) },
        { 
          $addToSet: { songIds: songRelation } as any,
          $set: { updatedAt: new Date() }
        }
      );
    }

    // Update additional artists
    if (Array.isArray(artists) && artists.length > 0) {
      for (const additionalArtist of artists) {
        if (additionalArtist.id && additionalArtist.name) {
          const songRelation = {
            songId: result.insertedId,
            role: additionalArtist.role || 'featured',
            songType: songType === 'album' ? 'single' as const : 'single' as const, // For additional artists, it appears as single in their discography
            albumId: songType === 'album' ? undefined : undefined // Additional artists don't get album ownership
          };
          
          await artistsCollection.updateOne(
            { _id: new ObjectId(additionalArtist.id) },
            { 
              $addToSet: { songIds: songRelation } as any,
              $set: { updatedAt: new Date() }
            }
          );
        }
      }
    }

    // Update album records if linked and it's an album track
    if (albumId && songType === 'album') {
      await albumsCollection.updateOne(
        { _id: new ObjectId(albumId) },
        { 
          $addToSet: { songIds: result.insertedId } as any,
          $inc: { duration: durationNum },
          $set: { updatedAt: new Date() }
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Music uploaded successfully',
      music: { _id: result.insertedId, ...newMusic }
    }, { status: 201 });

  } catch (error) {
    console.error('Music upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
