'use client';

import { useEffect, useState } from 'react';

interface Artist {
  id: string;
  name: string;
  role: 'primary' | 'featured' | 'producer' | 'writer';
}

interface Song {
  _id: string;
  title: string;
  artist: string;
  artists: Artist[];
  album: string;
  songType: 'album' | 'single';
  genre: string;
  duration: number;
  thumbnailUrl: string;
  fileUrl: string;
  createdAt: string;
}

interface DiscographyData {
  albums: Array<{
    _id: string;
    title: string;
    coverUrl: string;
    releaseDate: string;
    songs: Song[];
  }>;
  singles: Song[];
}

export default function ArtistDiscographyDemo() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await fetch('/api/music');
      if (response.ok) {
        const data = await response.json();
        setSongs(data.music || []);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatArtists = (song: Song) => {
    const mainArtist = song.artist;
    const featuredArtists = song.artists.filter(a => a.role === 'featured');
    const otherArtists = song.artists.filter(a => a.role !== 'featured');
    
    let result = mainArtist;
    
    if (featuredArtists.length > 0) {
      result += ` ft. ${featuredArtists.map(a => a.name).join(', ')}`;
    }
    
    if (otherArtists.length > 0) {
      result += ` (${otherArtists.map(a => `${a.name} - ${a.role}`).join(', ')})`;
    }
    
    return result;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-400">Loading music...</p>
      </div>
    );
  }

  const albumTracks = songs.filter(s => s.songType === 'album');
  const singles = songs.filter(s => s.songType === 'single');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-white">Music Library Demo</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-white">Album Tracks</h2>
        {albumTracks.length === 0 ? (
          <p className="text-gray-400">No album tracks yet.</p>
        ) : (
          <div className="grid gap-4">
            {albumTracks.map((song) => (
              <div key={song._id} className="bg-gray-800/50 rounded-lg p-4 border border-purple-600/20">
                <div className="flex items-center gap-4">
                  <img
                    src={song.thumbnailUrl}
                    alt={song.title}
                    className="w-16 h-16 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{song.title}</h3>
                      <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded-full">
                        Album Track
                      </span>
                    </div>
                    <p className="text-gray-300">{formatArtists(song)}</p>
                    <p className="text-gray-400 text-sm">{song.album} • {song.genre}</p>
                    <p className="text-gray-500 text-xs">
                      Duration: {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4 text-white">Singles</h2>
        {singles.length === 0 ? (
          <p className="text-gray-400">No singles yet.</p>
        ) : (
          <div className="grid gap-4">
            {singles.map((song) => (
              <div key={song._id} className="bg-gray-800/50 rounded-lg p-4 border border-blue-600/20">
                <div className="flex items-center gap-4">
                  <img
                    src={song.thumbnailUrl}
                    alt={song.title}
                    className="w-16 h-16 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{song.title}</h3>
                      <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                        Single
                      </span>
                    </div>
                    <p className="text-gray-300">{formatArtists(song)}</p>
                    <p className="text-gray-400 text-sm">{song.genre}</p>
                    <p className="text-gray-500 text-xs">
                      Duration: {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">How It Works:</h3>
        <ul className="text-gray-300 text-sm space-y-1">
          <li><strong>Album Tracks:</strong> Songs that belong to a specific album by the primary artist</li>
          <li><strong>Singles:</strong> Standalone songs or songs where the artist is featured/collaborating</li>
          <li><strong>Multiple Artists:</strong> Shows main artist + featured artists + other roles (producer, writer)</li>
          <li><strong>Artist Perspective:</strong> Each artist sees album tracks they own vs. singles they're featured on</li>
        </ul>
      </div>
    </div>
  );
}
