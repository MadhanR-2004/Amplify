import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const artistId = params.id;

    if (!ObjectId.isValid(artistId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid artist ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const artistsCollection = db.collection('artists');
    const musicCollection = db.collection('music');
    const albumsCollection = db.collection('albums');

    // Get artist information
    const artist = await artistsCollection.findOne({ _id: new ObjectId(artistId) });
    
    if (!artist) {
      return NextResponse.json(
        { success: false, message: 'Artist not found' },
        { status: 404 }
      );
    }

    // Get artist's songs organized by type
    const discography = {
      albums: [] as any[],
      singles: [] as any[]
    };

    // Get all songs where this artist is involved
    const artistSongs = await musicCollection.find({
      $or: [
        { artistId: new ObjectId(artistId) }, // Primary artist
        { 'artists.id': artistId } // Featured/collaborating artist
      ]
    }).toArray();

    // Group songs by album for primary artist, singles for others
    for (const song of artistSongs) {
      const isPrimaryArtist = song.artistId && song.artistId.toString() === artistId;
      const artistRole = isPrimaryArtist ? 'primary' : 
        song.artists?.find((a: any) => a.id === artistId)?.role || 'featured';

      const songData = {
        _id: song._id,
        title: song.title,
        duration: song.duration,
        thumbnailUrl: song.thumbnailUrl,
        fileUrl: song.fileUrl,
        genre: song.genre,
        createdAt: song.createdAt,
        role: artistRole,
        collaborators: song.artists?.filter((a: any) => a.id !== artistId) || []
      };

      if (isPrimaryArtist && song.songType === 'album' && song.albumId) {
        // This is an album track by the primary artist
        let album = discography.albums.find(a => a._id.toString() === song.albumId.toString());
        if (!album) {
          // Fetch album details
          const albumData = await albumsCollection.findOne({ _id: song.albumId });
          if (albumData) {
            album = {
              _id: albumData._id,
              title: albumData.title,
              coverUrl: albumData.coverUrl,
              releaseDate: albumData.releaseDate,
              description: albumData.description,
              songs: []
            };
            discography.albums.push(album);
          }
        }
        if (album) {
          album.songs.push(songData);
        }
      } else {
        // This appears as a single in the artist's discography
        // Either it's actually a single, or this artist is not the primary artist
        discography.singles.push({
          ...songData,
          album: song.album,
          primaryArtist: song.artist
        });
      }
    }

    // Sort albums by release date (newest first)
    discography.albums.sort((a, b) => {
      const dateA = new Date(a.releaseDate || a.createdAt || 0);
      const dateB = new Date(b.releaseDate || b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Sort singles by creation date (newest first)
    discography.singles.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // Sort songs within each album by track order (or creation date if no track order)
    discography.albums.forEach(album => {
      album.songs.sort((a: any, b: any) => {
        // For now, sort by creation date - you can add track number field later
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateA.getTime() - dateB.getTime();
      });
    });

    return NextResponse.json({
      success: true,
      artist: {
        _id: artist._id,
        name: artist.name,
        bio: artist.bio,
        imageUrl: artist.imageUrl,
        genre: artist.genre
      },
      discography
    });

  } catch (error) {
    console.error('Artist discography fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
