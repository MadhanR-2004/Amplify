'use client';

import { useState, useEffect, RefObject, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { 
  IconMusic, 
  IconDisc, 
  IconMicrophone,
  IconPlaylist,
  IconHeart,
  IconPlayerPlay,
  IconPlayerPause,
  IconArrowsShuffle,
  IconSearch,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconArrowLeft,
  IconVolume,
  IconVolumeOff,
  IconX,
  IconChevronUp,
  IconChevronDown
} from '@tabler/icons-react';

interface Music {
  _id: string;
  title: string;
  artist: string;
  artists?: {
    id: string;
    name: string;
    role: 'primary' | 'featured' | 'producer' | 'writer';
  }[];
  album: string;
  songType?: 'album' | 'single';
  genre: string | string[]; // Support both string and array for backward compatibility
  duration: number;
  thumbnailUrl: string;
  fileUrl: string;
  createdAt: string;
}

interface Album {
  name: string;
  artist: string;
  thumbnail: string;
  songs: Music[];
  duration: number;
  description?: string;
  releaseDate?: string;
  genre?: string[];
}

interface Artist {
  _id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  genre: string[];
  albumIds: string[];
  songIds: any[];
  createdAt: string;
  updatedAt: string;
}

interface MusicBrowserProps {
  activeView: string;
  music: Music[];
  currentSong: Music | null;
  isPlaying: boolean;
  onSongSelect: (song: Music, playlist?: Music[], playlistType?: string) => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  audioRef: RefObject<HTMLAudioElement>;
}

export default function MusicBrowser({
  activeView,
  music,
  currentSong,
  isPlaying,
  onSongSelect,
  onPlayPause,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  audioRef,
}: MusicBrowserProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<{ songs: Music[]; albums: any[]; artists: any[] }>({ songs: [], albums: [], artists: [] });
  const searchViewInputRef = useRef<HTMLInputElement>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<any | null>(null);
  const [currentAlbumSongIndex, setCurrentAlbumSongIndex] = useState(0);
  const [realAlbumsData, setRealAlbumsData] = useState<any[]>([]);
  const [allArtists, setAllArtists] = useState<Artist[]>([]);

  // Helper function to format genres
  const formatGenres = (genre: string | string[]): string => {
    if (Array.isArray(genre)) {
      return genre.join(', ');
    }
    return genre || '';
  };
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  // Track navigation context for album views
  const [albumContext, setAlbumContext] = useState<'albums' | 'artist' | null>(null);
  // Track whether to show all artist songs or just first 5
  const [showAllArtistSongs, setShowAllArtistSongs] = useState(false);
  // Mobile now playing sheet
  const [showMobileNowPlaying, setShowMobileNowPlaying] = useState(false);
  // Mobile detection to render a dedicated layout
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1279px)'); // below xl
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
    } else {
      // @ts-ignore - Safari
      mq.addListener(onChange);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', onChange);
      } else {
        // @ts-ignore - Safari
        mq.removeListener(onChange);
      }
    };
  }, []);

  // Debounce search term to reduce re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    filterData();
    
    // Clear selections when switching views (but not when search term changes)
    if (selectedArtist) {
      setSelectedArtist(null);
      setShowAllArtistSongs(false); // Reset artist songs view
    }
    if (selectedAlbum) {
      setSelectedAlbum(null);
      setAlbumContext(null);
    }
    
    if (activeView === 'albums' && realAlbumsData.length === 0) {
      fetchRealAlbumData();
    }
    if (activeView === 'artists') {
      if (allArtists.length === 0) {
        fetchAllArtists();
      }
    }
  }, [activeView, music, allArtists.length]);

  // Separate effect for search filtering to avoid clearing selections on search
  useEffect(() => {
    if (activeView === 'search') {
      setSearchResults(performAdvancedSearch(debouncedSearchTerm));
    } else {
      filterData();
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (activeView !== 'search') {
      filterData();
    }
  }, [activeView, music, allArtists.length]);

  // Update current time for progress bar
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setCurrentTime(0);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioRef, currentSong]);

  // Set volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioRef]);

  const fetchRealAlbumData = async () => {
    try {
      const response = await fetch('/api/admin/albums');
      if (response.ok) {
        const data = await response.json();
        setRealAlbumsData(data.albums || []);
      }
    } catch (error) {
      console.error('Error fetching album data:', error);
    }
  };

  const fetchAllArtists = async () => {
    try {
      const response = await fetch('/api/artists');
      if (response.ok) {
        const data = await response.json();
        setAllArtists(data.artists || []);
      }
    } catch (error) {
      console.error('Error fetching artists data:', error);
    }
  };

  const filterData = () => {
    let data: any[] = [];

    switch (activeView) {
      case 'songs':
        data = music;
        break;
      
      case 'albums':
        const albumMap = new Map();
        // Only include songs that are part of albums (not singles)
        music.filter(song => 
          song.songType !== 'single' && 
          song.album && 
          song.album.toLowerCase() !== 'unknown album' && 
          song.album !== ''
        ).forEach(song => {
          if (!albumMap.has(song.album)) {
            albumMap.set(song.album, {
              name: song.album,
              artist: song.artist,
              thumbnail: song.thumbnailUrl,
              songs: [],
              duration: 0,
            });
          }
          const album = albumMap.get(song.album);
          if (album && album.songs) {
            album.songs.push(song);
            album.duration += song.duration;
          }
        });
        
        // Merge with real album data to get descriptions and other details
        const albumsFromSongs = Array.from(albumMap.values());
        albumsFromSongs.forEach(album => {
          const realAlbum = realAlbumsData.find(real => 
            real.title.toLowerCase() === album.name.toLowerCase() && 
            real.artistName?.toLowerCase() === album.artist.toLowerCase()
          );
          if (realAlbum) {
            album.description = realAlbum.description;
            album.releaseDate = realAlbum.releaseDate;
            album.genre = realAlbum.genre;
            if (realAlbum.coverUrl) {
              album.thumbnail = realAlbum.coverUrl;
            }
          }
        });
        
        data = albumsFromSongs;
        break;
      
      case 'artists':
        // Use all artists from the database
        data = allArtists
          .map(artist => {
            // Get songs for this artist from the music collection
            const artistSongs = music.filter(song => 
              song.artist === artist.name || 
              (song.artists && song.artists.some(a => a.name === artist.name))
            );
            
            // Get albums for this artist
            const artistAlbums = new Set();
            artistSongs.forEach(song => {
              if (song.songType === 'album' && song.album) {
                artistAlbums.add(song.album);
              }
            });
            
            return {
              _id: artist._id,
              name: artist.name,
              bio: artist.bio,
              thumbnail: artist.imageUrl || '/default-thumbnail.svg',
              genre: artist.genre,
              songs: artistSongs,
              albums: artistAlbums,
              songCount: artistSongs.length,
              albumCount: artistAlbums.size
            };
          })
          .sort((a, b) => {
            // Sort by song count (artists with songs first), then by name
            if (a.songCount === 0 && b.songCount > 0) return 1;
            if (a.songCount > 0 && b.songCount === 0) return -1;
            return a.name.localeCompare(b.name);
          });
        break;
      
      case 'search':
        // For search view, we'll handle the data differently
        // Don't set filteredData here, let the search view handle its own data
        return;
      
      default:
        data = music;
    }

    setFilteredData(data);
  };

  const performAdvancedSearch = (term: string) => {
    if (!term.trim()) return { songs: [], albums: [], artists: [] };

    const lowerTerm = term.toLowerCase();
    
    // Enhanced search for songs with artist and album information
    const matchingSongs = music.filter(song =>
      song.title.toLowerCase().includes(lowerTerm) ||
      song.artist.toLowerCase().includes(lowerTerm) ||
      song.album.toLowerCase().includes(lowerTerm) ||
      (typeof song.genre === 'string' && song.genre.toLowerCase().includes(lowerTerm)) ||
      (Array.isArray(song.genre) && song.genre.some(g => g.toLowerCase().includes(lowerTerm)))
    ).map(song => {
      // Add related artist information
      const relatedArtist = allArtists.find(artist => 
        artist.name === song.artist || 
        (song.artists && song.artists.some(a => a.name === artist.name))
      );
      
      // Find the album this song belongs to
      const songAlbum = song.songType !== 'single' && song.album && 
        song.album.toLowerCase() !== 'unknown album' && song.album !== '' 
        ? {
            name: song.album,
            artist: song.artist,
            thumbnail: song.thumbnailUrl
          } 
        : null;

      return {
        ...song,
        relatedArtist: relatedArtist ? {
          _id: relatedArtist._id,
          name: relatedArtist.name,
          bio: relatedArtist.bio,
          thumbnail: relatedArtist.imageUrl || '/default-thumbnail.svg',
          genre: relatedArtist.genre
        } : null,
        relatedAlbum: songAlbum
      };
    });

    // Enhanced search for albums with artist and song information
    const albumMap = new Map();
    music.filter(song => 
      song.songType !== 'single' && 
      song.album && 
      song.album.toLowerCase() !== 'unknown album' && 
      song.album !== ''
    ).forEach(song => {
      if (!albumMap.has(song.album)) {
        albumMap.set(song.album, {
          name: song.album,
          artist: song.artist,
          thumbnail: song.thumbnailUrl,
          songs: [],
          duration: 0,
        });
      }
      const album = albumMap.get(song.album);
      if (album && album.songs) {
        album.songs.push(song);
        album.duration += song.duration;
      }
    });

    const matchingAlbums = Array.from(albumMap.values())
      .filter(album =>
        album.name.toLowerCase().includes(lowerTerm) ||
        album.artist.toLowerCase().includes(lowerTerm)
      )
      .map(album => {
        // Add related artist information
        const relatedArtist = allArtists.find(artist => artist.name === album.artist);
        
        return {
          ...album,
          relatedArtist: relatedArtist ? {
            _id: relatedArtist._id,
            name: relatedArtist.name,
            bio: relatedArtist.bio,
            thumbnail: relatedArtist.imageUrl || '/default-thumbnail.svg',
            genre: relatedArtist.genre
          } : null,
          topSongs: album.songs.slice(0, 3) // Show top 3 songs from the album
        };
      });

    // Enhanced search for artists with albums and songs information
    const matchingArtists = allArtists
      .filter(artist => 
        artist.name.toLowerCase().includes(lowerTerm) ||
        (artist.bio && artist.bio.toLowerCase().includes(lowerTerm)) ||
        (artist.genre && artist.genre.some(g => g.toLowerCase().includes(lowerTerm)))
      )
      .map(artist => {
        const artistSongs = music.filter(song => 
          song.artist === artist.name || 
          (song.artists && song.artists.some(a => a.name === artist.name))
        );
        
        // Get unique albums for this artist
        const artistAlbumsSet = new Set();
        const artistAlbums: Array<{
          name: string;
          thumbnail: string;
          songs: Music[];
        }> = [];
        artistSongs.forEach(song => {
          if (song.songType === 'album' && song.album && !artistAlbumsSet.has(song.album)) {
            artistAlbumsSet.add(song.album);
            artistAlbums.push({
              name: song.album,
              thumbnail: song.thumbnailUrl,
              songs: artistSongs.filter(s => s.album === song.album)
            });
          }
        });
        
        return {
          _id: artist._id,
          name: artist.name,
          bio: artist.bio,
          thumbnail: artist.imageUrl || '/default-thumbnail.svg',
          genre: artist.genre,
          songs: artistSongs,
          albums: artistAlbums,
          songCount: artistSongs.length,
          albumCount: artistAlbums.length,
          topSongs: artistSongs.slice(0, 5), // Show top 5 songs
          relatedAlbums: artistAlbums.slice(0, 3) // Show top 3 albums
        };
      });

    return {
      songs: matchingSongs,
      albums: matchingAlbums,
      artists: matchingArtists
    };
  };

  const getViewIcon = () => {
    switch (activeView) {
      case 'songs': return <IconMusic size={20} />;
      case 'albums': return <IconDisc size={20} />;
      case 'artists': return <IconMicrophone size={20} />;
      case 'playlists': return <IconPlaylist size={20} />;
      case 'favorites': return <IconHeart size={20} />;
      default: return <IconMusic size={20} />;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatArtists = (song: Music) => {
    // If there are multiple artists in the artists array, format them nicely
    if (song.artists && song.artists.length > 0) {
      const primaryArtists = song.artists.filter(a => a.role === 'primary');
      const featuredArtists = song.artists.filter(a => a.role === 'featured');
      
      let artistString = '';
      
      if (primaryArtists.length > 0) {
        artistString = primaryArtists.map(a => a.name).join(', ');
      } else {
        artistString = song.artist; // Fallback to main artist
      }
      
      if (featuredArtists.length > 0) {
        artistString += ` (feat. ${featuredArtists.map(a => a.name).join(', ')})`;
      }
      
      return artistString;
    }
    
    return song.artist; // Fallback to original artist field
  };

  const getSongType = (song: Music) => {
    // Check if it's explicitly marked as single or if album is empty/unknown
    if (song.songType === 'single' || !song.album || song.album.toLowerCase() === 'unknown album' || song.album === '') {
      return 'Single';
    }
    return song.album;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !currentSong) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = clickX / rect.width;
    const newTime = progress * currentSong.duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newVolume = Math.max(0, Math.min(1, clickX / rect.width));
    setVolume(newVolume);
  };

  const handleAlbumClick = (album: Album, context: 'albums' | 'artist' = 'albums') => {
    setSelectedAlbum(album);
    setCurrentAlbumSongIndex(0);
    setAlbumContext(context);
  };

  const handleAlbumClickFromArtist = (album: Album) => {
    handleAlbumClick(album, 'artist');
  };

  const handleArtistClick = async (artist: any) => {
    try {
      // Use the artist data we already have from the database
      const artistData: {
        _id: string;
        name: string;
        bio?: string;
        thumbnail: string;
        genre: string[];
        songs: Music[];
        albums: any[];
        singles: Music[];
      } = {
        _id: artist._id,
        name: artist.name,
        bio: artist.bio,
        thumbnail: artist.thumbnail,
        genre: artist.genre || [],
        songs: artist.songs || [],
        albums: [],
        singles: []
      };

      // Separate albums and singles
      const albumMap = new Map();
      
      artistData.songs.forEach((song: Music) => {
        if (song.songType === 'single' || !song.album || song.album.toLowerCase() === 'unknown album' || song.album === '') {
          artistData.singles.push(song);
        } else {
          if (!albumMap.has(song.album)) {
            albumMap.set(song.album, {
              name: song.album,
              thumbnail: song.thumbnailUrl,
              songs: [],
              duration: 0
            });
          }
          const album = albumMap.get(song.album);
          album.songs.push(song);
          album.duration += song.duration;
        }
      });

      artistData.albums = Array.from(albumMap.values());
      
      setSelectedArtist(artistData);
      setShowAllArtistSongs(false); // Reset to show only first 5 songs initially
    } catch (error) {
      console.error('Error handling artist click:', error);
      // Fallback: just set the basic artist data
      setSelectedArtist({
        _id: artist._id,
        name: artist.name,
        bio: artist.bio,
        thumbnail: artist.thumbnail,
        genre: artist.genre || [],
        songs: artist.songs || [],
        albums: [],
        singles: artist.songs || []
      });
      setShowAllArtistSongs(false); // Reset to show only first 5 songs initially
    }
  };

  const handleAlbumSongPlay = (song: Music, index: number) => {
    setCurrentAlbumSongIndex(index);
    onSongSelect(song, selectedAlbum?.songs, 'album');
  };

  const playNextSong = () => {
    if (selectedAlbum && currentAlbumSongIndex < selectedAlbum.songs.length - 1) {
      const nextIndex = currentAlbumSongIndex + 1;
      setCurrentAlbumSongIndex(nextIndex);
      onSongSelect(selectedAlbum.songs[nextIndex], selectedAlbum.songs, 'album');
    }
  };

  const playPreviousSong = () => {
    if (selectedAlbum && currentAlbumSongIndex > 0) {
      const prevIndex = currentAlbumSongIndex - 1;
      setCurrentAlbumSongIndex(prevIndex);
      onSongSelect(selectedAlbum.songs[prevIndex], selectedAlbum.songs, 'album');
    }
  };

  const playAlbumFromStart = () => {
    if (selectedAlbum && selectedAlbum.songs.length > 0) {
      setCurrentAlbumSongIndex(0);
      onSongSelect(selectedAlbum.songs[0], selectedAlbum.songs, 'album');
    }
  };

  // --------------------
  // Mobile-specific layouts
  // --------------------
  const MobileHeader = () => (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="text-lg font-bold flex items-center gap-2 capitalize">
        {getViewIcon()}
        {activeView}
      </h2>
      {/* Keep space for FloatingDock hamburger positioned globally */}
    </div>
  );

  const renderMobileMainView = () => (
    <div className="flex-1 p-3">
      <MobileHeader />

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'grid gap-3',
            activeView === 'songs'
              ? 'grid-cols-1'
              : activeView === 'albums'
              ? 'grid-cols-2'
              : 'grid-cols-1'
          )}
        >
          {activeView === 'songs' && (
            <>
              {filteredData.map((song: Music, index: number) => (
                <motion.div
                  key={song._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    'group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 cursor-pointer',
                    'bg-white/5 backdrop-blur-sm border border-white/10',
                    'hover:bg-white/10 hover:border-white/20',
                    currentSong?._id === song._id && 'bg-blue-500/20 border-blue-400/50'
                  )}
                  onClick={() => onSongSelect(song, filteredData, 'songs')}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={song.thumbnailUrl}
                      alt={song.title}
                      className="w-12 h-12 rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate text-sm">{song.title}</h3>
                    <p className="text-gray-400 text-xs truncate">{formatArtists(song)} • {getSongType(song)}</p>
                  </div>
                  <div className="text-gray-400 text-xs flex-shrink-0">{formatDuration(song.duration)}</div>
                </motion.div>
              ))}
            </>
          )}

          {activeView === 'albums' && (
            <>
              {filteredData.map((album: Album, index: number) => (
                <motion.div
                  key={album.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.04 }}
                  className="group cursor-pointer"
                  onClick={() => handleAlbumClick(album)}
                >
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                    <div className="relative mb-3">
                      <img
                        src={album.thumbnail}
                        alt={album.name}
                        className="w-full aspect-square rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white truncate text-sm">{album.name}</h3>
                    <p className="text-gray-400 text-xs truncate">{album.artist}</p>
                  </div>
                </motion.div>
              ))}
            </>
          )}

          {activeView === 'artists' && (
            <>
              {filteredData.map((artist: any, index: number) => (
                <motion.div
                  key={artist.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.04 }}
                  className="group cursor-pointer"
                  onClick={() => handleArtistClick(artist)}
                >
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                    <div className="relative mb-3">
                      <img
                        src={artist.thumbnail}
                        alt={artist.name}
                        className="w-full aspect-square rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                        }}
                      />
                    </div>
                    <h3 className="font-semibold text-white truncate text-sm">{artist.name}</h3>
                    <p className="text-gray-400 text-xs">{artist.songCount || 0} songs • {artist.albumCount || 0} albums</p>
                  </div>
                </motion.div>
              ))}
            </>
          )}

          {/* Mobile Coming Soon Views for Playlists and Favorites */}
          {(activeView === 'playlists' || activeView === 'favorites') && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center w-full max-w-sm mx-auto"
              >
                {activeView === 'playlists' ? (
                  <IconPlaylist size={48} className="text-gray-400 mx-auto mb-4" />
                ) : (
                  <IconHeart size={48} className="text-gray-400 mx-auto mb-4" />
                )}
                <h3 className="text-lg font-semibold text-white mb-2">
                  {activeView === 'playlists' ? 'Playlists' : 'Favorites'}
                </h3>
                <p className="text-gray-400 mb-4 text-sm">
                  This feature will be available in future updates
                </p>
                <p className="text-gray-500 text-xs">
                  Stay tuned for playlist management and favorites functionality!
                </p>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {filteredData.length === 0 && activeView !== 'playlists' && activeView !== 'favorites' && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-base">No {activeView} found</div>
        </div>
      )}
    </div>
  );

  if (selectedArtist && !selectedAlbum) {
    return (
      <div className="flex-1 p-3 sm:p-4 md:p-6">
        {/* Use same responsive grid layout as main view */}
        <div className="mx-auto w-full max-w-screen-2xl grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 xl:grid-cols-12">
          {/* Artist Content Area - takes 3/4 of screen like main content */}
          <div className="xl:col-span-8 2xl:col-span-9 min-w-0">
            {/* Back Button */}
            <button
              onClick={() => setSelectedArtist(null)}
              className="flex items-center gap-2 mb-4 sm:mb-6 text-gray-400 hover:text-white transition-colors"
            >
              <IconArrowLeft size={20} />
              Back to Artists
            </button>

            {/* Artist Header - responsive layout */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <img
                  src={selectedArtist.thumbnail}
                  alt={selectedArtist.name}
                  className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full object-cover shadow-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                  }}
                />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">{selectedArtist.name}</h1>
                
                {/* Artist Bio */}
                {selectedArtist.bio && (
                  <p className="text-gray-300 text-sm sm:text-base mb-4 leading-relaxed px-4 md:px-0">
                    {selectedArtist.bio}
                  </p>
                )}
                
                {/* Artist Genres */}
                {(() => {
                  const artistGenres = Array.isArray(selectedArtist.genre)
                    ? (selectedArtist.genre as any[]).filter(Boolean)
                    : selectedArtist.genre
                    ? [selectedArtist.genre]
                    : [];
                  return artistGenres.length > 0 ? (
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                      {artistGenres.map((genre: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 sm:px-3 py-1 bg-white/10 text-white rounded-full text-xs sm:text-sm border border-white/20 backdrop-blur-md"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  ) : null;
                })()}
                
                {/* Artist Stats */}
                <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-4 text-sm text-gray-400 mb-4">
                  <span>{selectedArtist.songs.length} total songs</span>
                  <span>•</span>
                  <span>{selectedArtist.albums.length} albums</span>
                  <span>•</span>
                  <span>{selectedArtist.singles.length} singles</span>
                </div>
                
                {/* Playback Controls */}
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-4">
                  {selectedArtist.songs.length > 0 ? (
                    <button
                      onClick={() => {
                        onSongSelect(selectedArtist.songs[0], selectedArtist.songs, 'artist');
                      }}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-white font-semibold transition-colors text-sm sm:text-base"
                    >
                      <IconPlayerPlay size={20} />
                      Play All
                    </button>
                  ) : (
                    <div className="text-gray-400 text-sm italic">
                      No songs available for this artist yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Artist Content Sections */}
            <div className="space-y-6 sm:space-y-8">
              {/* All Songs Section */}
              {selectedArtist.songs.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-white">All Songs</h2>
                      <span className="text-gray-400 text-sm">{selectedArtist.songs.length} songs</span>
                    </div>
                  </div>
                  <div className="divide-y divide-white/10">
                    {(showAllArtistSongs ? selectedArtist.songs : selectedArtist.songs.slice(0, 5)).map((song: Music, index: number) => (
                      <motion.div
                        key={song._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          "flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors",
                          currentSong?._id === song._id && "bg-white/10"
                        )}
                        onClick={() => onSongSelect(song, selectedArtist.songs, 'artist')}
                      >
                        <div className="w-8 text-center">
                          {currentSong?._id === song._id && isPlaying ? (
                            <IconPlayerPause size={16} className="text-green-400" />
                          ) : (
                            <span className="text-gray-400 text-sm">{showAllArtistSongs ? index + 1 : index + 1}</span>
                          )}
                        </div>
                        <img
                          src={song.thumbnailUrl}
                          alt={song.title}
                          className="w-12 h-12 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-medium truncate",
                            currentSong?._id === song._id ? "text-green-400" : "text-white"
                          )}>
                            {song.title}
                          </h3>
                          <p className="text-gray-400 text-sm truncate">
                            {formatArtists(song)} • {getSongType(song)}
                          </p>
                          {song.genre && (
                            <p className="text-gray-500 text-xs truncate">{song.genre}</p>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {formatDuration(song.duration)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSongSelect(song, selectedArtist.songs, 'artist');
                          }}
                          className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                          {currentSong?._id === song._id && isPlaying ? (
                            <IconPlayerPause size={16} />
                          ) : (
                            <IconPlayerPlay size={16} />
                          )}
                        </button>
                      </motion.div>
                    ))}
                    
                    {/* Show More/Less Button */}
                    {selectedArtist.songs.length > 5 && (
                      <div className="p-4 border-t border-white/10">
                        <button
                          onClick={() => setShowAllArtistSongs(!showAllArtistSongs)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors"
                        >
                          {showAllArtistSongs ? (
                            <>
                              <IconChevronUp size={16} />
                              Show Less
                            </>
                          ) : (
                            <>
                              <IconChevronDown size={16} />
                              Show {selectedArtist.songs.length - 5} More Songs
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Albums Section */}
              {selectedArtist.albums.length > 0 ? (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">Albums</h2>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {selectedArtist.albums.map((album: any, index: number) => (
                        <motion.div
                          key={album.name}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="group cursor-pointer"
                          onClick={() => handleAlbumClickFromArtist(album)}
                        >
                          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                            <div className="relative mb-3">
                              <img
                                src={album.thumbnail}
                                alt={album.name}
                                className="w-full aspect-square rounded-lg object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                                }}
                              />
                              <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <IconPlayerPlay size={20} className="text-white" />
                              </button>
                            </div>
                            <h3 className="font-semibold text-white truncate text-sm">{album.name}</h3>
                            <p className="text-gray-400 text-xs">
                              {album.songs.length} songs • {formatDuration(album.duration)}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : selectedArtist.songs.length > 0 ? (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-4 text-center">
                    <h2 className="text-xl font-semibold text-white mb-2">Albums</h2>
                    <p className="text-gray-400">This artist has songs but no complete albums yet.</p>
                  </div>
                </div>
              ) : null}

              {/* Singles Section */}
              {selectedArtist.singles.length > 0 ? (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">Singles</h2>
                  </div>
                  <div className="divide-y divide-white/10">
                    {selectedArtist.singles.map((song: Music, index: number) => (
                      <motion.div
                        key={song._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          "flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors",
                          currentSong?._id === song._id && "bg-white/10"
                        )}
                        onClick={() => onSongSelect(song, selectedArtist.singles, 'artist')}
                      >
                        <img
                          src={song.thumbnailUrl}
                          alt={song.title}
                          className="w-12 h-12 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-medium truncate",
                            currentSong?._id === song._id ? "text-green-400" : "text-white"
                          )}>
                            {song.title}
                          </h3>
                          <p className="text-gray-400 text-sm truncate">
                            {formatArtists(song)} • Single
                          </p>
                          {song.genre && (
                            <p className="text-gray-500 text-xs truncate">{song.genre}</p>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {formatDuration(song.duration)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSongSelect(song, selectedArtist.singles, 'artist');
                          }}
                          className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                          {currentSong?._id === song._id && isPlaying ? (
                            <IconPlayerPause size={16} />
                          ) : (
                            <IconPlayerPlay size={16} />
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : selectedArtist.songs.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
                  <div className="p-6 text-center">
                    <div className="text-gray-400 mb-4">
                      <IconMusic size={48} className="mx-auto mb-2 opacity-50" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">No Music Yet</h2>
                    <p className="text-gray-400">
                      This artist hasn't released any music on this platform yet. Check back later!
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          
          {/* Now Playing Section (right column) - same as main view */}
          <div className="hidden xl:block xl:col-span-4 2xl:col-span-3">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sticky top-6">
              {currentSong ? (
                <>
                  <h3 className="text-base font-semibold text-white mb-4">Now Playing</h3>
                  
                  {/* Album Art */}
                  <div className="relative mb-4">
                    <img
                      src={currentSong.thumbnailUrl}
                      alt={currentSong.title}
                      className="w-full aspect-square rounded-lg object-cover shadow-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-lg" />
                  </div>

                  {/* Song Info */}
                  <div className="mb-4 text-center">
                    <h4 className="font-bold text-white text-base mb-1 truncate">{currentSong.title}</h4>
                    <p className="text-gray-300 text-sm mb-1 truncate">{formatArtists(currentSong)}</p>
                    <p className="text-gray-400 text-xs truncate">{getSongType(currentSong)}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatDuration(currentSong.duration)}</span>
                    </div>
                    <div 
                      className="relative bg-gray-700 rounded-full h-1 cursor-pointer group"
                      onClick={handleProgressClick}
                    >
                      <div 
                        className="absolute top-0 left-0 bg-green-500 rounded-full h-1 transition-all duration-100"
                        style={{ 
                          width: currentSong.duration > 0 
                            ? `${(currentTime / currentSong.duration) * 100}%` 
                            : '0%' 
                        }}
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ 
                          left: currentSong.duration > 0 
                            ? `calc(${(currentTime / currentSong.duration) * 100}% - 6px)` 
                            : '-6px' 
                        }}
                      />
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <button
                      onClick={onPrevious}
                      disabled={!canGoPrevious}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <IconPlayerSkipBack size={20} />
                    </button>
                    
                    <button
                      onClick={onPlayPause}
                      className="p-2.5 bg-green-600 hover:bg-green-700 rounded-full text-white transition-colors"
                    >
                      {isPlaying ? <IconPlayerPause size={24} /> : <IconPlayerPlay size={24} />}
                    </button>
                    
                    <button
                      onClick={onNext}
                      disabled={!canGoNext}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <IconPlayerSkipForward size={20} />
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3">
                      {volume === 0 ? <IconVolumeOff size={14} className="text-gray-400" /> : <IconVolume size={14} className="text-gray-400" />}
                      <div 
                        className="flex-1 relative bg-gray-700 rounded-full h-1 cursor-pointer group"
                        onClick={handleVolumeChange}
                      >
                        <div 
                          className="absolute top-0 left-0 bg-white rounded-full h-1 transition-all duration-100"
                          style={{ width: `${volume * 100}%` }}
                        />
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ left: `calc(${volume * 100}% - 6px)` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>

                  {/* Song Info */}
                  <div className="border-t border-white/10 pt-4">
                    <div className="text-xs text-gray-400 space-y-2">
                      <div className="flex justify-between">
                        <span>Genre:</span>
                        <span className="text-gray-300">{formatGenres(currentSong.genre)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="text-gray-300">{formatDuration(currentSong.duration)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-white mb-4">Music Player</h3>
                  
                  {/* Placeholder Album Art */}
                  <div className="relative mb-4">
                    <div className="w-full aspect-square rounded-lg bg-gray-800/50 flex items-center justify-center">
                      <IconMusic size={40} className="text-gray-600" />
                    </div>
                  </div>

                  {/* Placeholder Info */}
                  <div className="mb-4 text-center">
                    <h4 className="font-bold text-gray-500 text-base mb-1">No song selected</h4>
                    <p className="text-gray-600 text-sm mb-1">Choose a song to start playing</p>
                  </div>

                  {/* Disabled Controls */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <button
                      disabled
                      className="p-2 text-gray-600 cursor-not-allowed"
                    >
                      <IconPlayerSkipBack size={20} />
                    </button>
                    
                    <button
                      disabled
                      className="p-2.5 bg-gray-700 rounded-full text-gray-600 cursor-not-allowed"
                    >
                      <IconPlayerPlay size={24} />
                    </button>
                    
                    <button
                      disabled
                      className="p-2 text-gray-600 cursor-not-allowed"
                    >
                      <IconPlayerSkipForward size={20} />
                    </button>
                  </div>

                  {/* Welcome Message */}
                  <div className="text-center text-gray-500 text-sm">
                    Select any song from this artist to start playing
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
  {/* Mobile mini player rendered centrally in dashboard */}
      </div>
    );
  }

  if (selectedAlbum) {
    return (
      <div className="flex-1 p-3 sm:p-4 md:p-6">
        {/* Use same responsive grid layout as main view */}
        <div className="mx-auto w-full max-w-screen-2xl grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 xl:grid-cols-12">
          {/* Album Content Area - takes 3/4 of screen like main content */}
          <div className="xl:col-span-8 2xl:col-span-9 min-w-0">
            {/* Back Button */}
            <button
              onClick={() => {
                if (albumContext === 'artist') {
                  // Return to artist view - keep selectedArtist, clear selectedAlbum
                  setSelectedAlbum(null);
                  setAlbumContext(null);
                } else {
                  // Return to albums view - clear both
                  setSelectedAlbum(null);
                  setAlbumContext(null);
                }
              }}
              className="flex items-center gap-2 mb-4 sm:mb-6 text-gray-400 hover:text-white transition-colors"
            >
              <IconArrowLeft size={20} />
              {albumContext === 'artist' ? 'Back to Artist' : 'Back to Albums'}
            </button>

            {/* Album Header - responsive layout */}
            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <img
                src={selectedAlbum.thumbnail}
                alt={selectedAlbum.name}
                className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-xl object-cover shadow-2xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                }}
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">{selectedAlbum.name}</h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-2">{selectedAlbum.artist}</p>
              
              {/* Album Description */}
              {selectedAlbum.description && (
                <p className="text-gray-400 mb-4 text-sm sm:text-base leading-relaxed px-4 md:px-0">
                  {selectedAlbum.description}
                </p>
              )}
              
              {/* Album Details */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-4 text-sm text-gray-400 mb-4">
                <span>{selectedAlbum.songs.length} songs</span>
                <span>•</span>
                <span>{formatDuration(selectedAlbum.duration)}</span>
                {selectedAlbum.releaseDate && (
                  <>
                    <span>•</span>
                    <span>{new Date(selectedAlbum.releaseDate).getFullYear()}</span>
                  </>
                )}
              </div>
              
              {/* Genres */}
              {selectedAlbum.genre && selectedAlbum.genre.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4 sm:mb-6">
                  {selectedAlbum.genre.map((genre, index) => (
                    <span
                      key={index}
                      className="px-2 sm:px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs sm:text-sm border border-blue-600/30"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Playback Controls */}
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 sm:gap-4">
                <button
                  onClick={playAlbumFromStart}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-white font-semibold transition-colors text-sm sm:text-base"
                >
                  <IconPlayerPlay size={20} />
                  Play Album
                </button>
                <button
                  onClick={playPreviousSong}
                  disabled={currentAlbumSongIndex === 0}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <IconPlayerSkipBack size={20} />
                </button>
                <button
                  onClick={onPlayPause}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  {isPlaying ? <IconPlayerPause size={20} /> : <IconPlayerPlay size={20} />}
                </button>
                <button
                  onClick={playNextSong}
                  disabled={currentAlbumSongIndex === selectedAlbum.songs.length - 1}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <IconPlayerSkipForward size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Song List */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">Songs</h2>
            </div>
            <div className="divide-y divide-white/10">
              {selectedAlbum.songs.map((song, index) => (
                <motion.div
                  key={song._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    "flex items-center gap-4 p-4 hover:bg-white/5 cursor-pointer transition-colors",
                    currentSong?._id === song._id && "bg-white/10",
                    currentAlbumSongIndex === index && "bg-blue-500/20"
                  )}
                  onClick={() => handleAlbumSongPlay(song, index)}
                >
                  <div className="w-8 text-center">
                    {currentSong?._id === song._id && isPlaying ? (
                      <IconPlayerPause size={16} className="text-green-400" />
                    ) : (
                      <span className="text-gray-400 text-sm">{index + 1}</span>
                    )}
                  </div>
                  <img
                    src={song.thumbnailUrl}
                    alt={song.title}
                    className="w-12 h-12 rounded object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className={cn(
                      "font-medium truncate",
                      currentSong?._id === song._id ? "text-green-400" : "text-white"
                    )}>
                      {song.title}
                    </h3>
                    <p className="text-gray-400 text-sm truncate">{formatArtists(song)}</p>
                    {song.genre && (
                      <p className="text-gray-500 text-xs truncate">{song.genre}</p>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {formatDuration(song.duration)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAlbumSongPlay(song, index);
                    }}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    {currentSong?._id === song._id && isPlaying ? (
                      <IconPlayerPause size={16} />
                    ) : (
                      <IconPlayerPlay size={16} />
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
          </div>
          
          {/* Now Playing Section (right column) - same as main view */}
          <div className="hidden xl:block xl:col-span-4 2xl:col-span-3">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sticky top-6">
              {currentSong ? (
                <>
                  <h3 className="text-base font-semibold text-white mb-4">Now Playing</h3>
                  
                  {/* Album Art */}
                  <div className="relative mb-4">
                    <img
                      src={currentSong.thumbnailUrl}
                      alt={currentSong.title}
                      className="w-full aspect-square rounded-lg object-cover shadow-xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-lg" />
                  </div>

                  {/* Song Info */}
                  <div className="mb-4 text-center">
                    <h4 className="font-bold text-white text-base mb-1 truncate">{currentSong.title}</h4>
                    <p className="text-gray-300 text-sm mb-1 truncate">{formatArtists(currentSong)}</p>
                    <p className="text-gray-400 text-xs truncate">{getSongType(currentSong)}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatDuration(currentSong.duration)}</span>
                    </div>
                    <div 
                      className="relative bg-gray-700 rounded-full h-1 cursor-pointer group"
                      onClick={handleProgressClick}
                    >
                      <div 
                        className="absolute top-0 left-0 bg-green-500 rounded-full h-1 transition-all duration-100"
                        style={{ 
                          width: currentSong.duration > 0 
                            ? `${(currentTime / currentSong.duration) * 100}%` 
                            : '0%' 
                        }}
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ 
                          left: currentSong.duration > 0 
                            ? `calc(${(currentTime / currentSong.duration) * 100}% - 6px)` 
                            : '-6px' 
                        }}
                      />
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <button
                      onClick={onPrevious}
                      disabled={!canGoPrevious}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <IconPlayerSkipBack size={20} />
                    </button>
                    
                    <button
                      onClick={onPlayPause}
                      className="p-2.5 bg-green-600 hover:bg-green-700 rounded-full text-white transition-colors"
                    >
                      {isPlaying ? <IconPlayerPause size={24} /> : <IconPlayerPlay size={24} />}
                    </button>
                    
                    <button
                      onClick={onNext}
                      disabled={!canGoNext}
                      className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <IconPlayerSkipForward size={20} />
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3">
                      {volume === 0 ? <IconVolumeOff size={14} className="text-gray-400" /> : <IconVolume size={14} className="text-gray-400" />}
                      <div 
                        className="flex-1 relative bg-gray-700 rounded-full h-1 cursor-pointer group"
                        onClick={handleVolumeChange}
                      >
                        <div 
                          className="absolute top-0 left-0 bg-white rounded-full h-1 transition-all duration-100"
                          style={{ width: `${volume * 100}%` }}
                        />
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ left: `calc(${volume * 100}% - 6px)` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-8">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>

                  {/* Song Info */}
                  <div className="border-t border-white/10 pt-4">
                    <div className="text-xs text-gray-400 space-y-2">
                      <div className="flex justify-between">
                        <span>Genre:</span>
                        <span className="text-gray-300">{formatGenres(currentSong.genre)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="text-gray-300">{formatDuration(currentSong.duration)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-white mb-4">Music Player</h3>
                  
                  {/* Placeholder Album Art */}
                  <div className="relative mb-4">
                    <div className="w-full aspect-square rounded-lg bg-gray-800/50 flex items-center justify-center">
                      <IconMusic size={40} className="text-gray-600" />
                    </div>
                  </div>

                  {/* Placeholder Info */}
                  <div className="mb-4 text-center">
                    <h4 className="font-bold text-gray-500 text-base mb-1">No song selected</h4>
                    <p className="text-gray-600 text-sm mb-1">Choose a song to start playing</p>
                  </div>

                  {/* Disabled Controls */}
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <button
                      disabled
                      className="p-2 text-gray-600 cursor-not-allowed"
                    >
                      <IconPlayerSkipBack size={20} />
                    </button>
                    
                    <button
                      disabled
                      className="p-2.5 bg-gray-700 rounded-full text-gray-600 cursor-not-allowed"
                    >
                      <IconPlayerPlay size={24} />
                    </button>
                    
                    <button
                      disabled
                      className="p-2 text-gray-600 cursor-not-allowed"
                    >
                      <IconPlayerSkipForward size={20} />
                    </button>
                  </div>

                  {/* Welcome Message */}
                  <div className="text-center text-gray-500 text-sm">
                    Select any song from the album to start playing
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
  {/* Mobile mini player rendered centrally in dashboard */}
      </div>
    );
  }

  if (activeView === 'search') {
    return (
      <div className="flex-1 p-3 sm:p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
            <IconSearch size={20} className="sm:w-6 sm:h-6" />
            Search Music
          </h2>
          <input
            ref={searchViewInputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Search for songs, artists, albums..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              // Ensure focus is maintained on touch devices
              setTimeout(() => {
                if (searchViewInputRef.current) {
                  searchViewInputRef.current.focus();
                }
              }, 100);
            }}
            onFocus={(e) => {
              try { e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
            }}
            className="w-full px-3 sm:px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 text-sm sm:text-base pointer-events-auto mb-6"
          />
          
          {/* Search Results */}
          {searchTerm.trim() && (
            <div className="space-y-8">
              {/* Songs Results */}
              {searchResults.songs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <IconMusic size={18} />
                    Songs ({searchResults.songs.length})
                  </h3>
                  <div className="grid gap-3">
                    {searchResults.songs.slice(0, 5).map((song: any) => (
                      <motion.div
                        key={song._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200 cursor-pointer",
                          "bg-white/5 backdrop-blur-sm border border-white/10",
                          "hover:bg-white/10 hover:border-white/20",
                          currentSong?._id === song._id && "bg-blue-500/20 border-blue-400/50"
                        )}
                        onClick={() => onSongSelect(song, searchResults.songs, 'search')}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={song.thumbnailUrl}
                            alt={song.title}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentSong?._id === song._id) {
                                onPlayPause();
                              } else {
                                onSongSelect(song, searchResults.songs, 'search');
                              }
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {currentSong?._id === song._id && isPlaying ? (
                              <IconPlayerPause size={16} className="text-white" />
                            ) : (
                              <IconPlayerPlay size={16} className="text-white" />
                            )}
                          </button>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate text-sm sm:text-base">{song.title}</h4>
                          <p className="text-gray-400 text-xs sm:text-sm truncate">
                            {formatArtists(song)} • {getSongType(song)}
                          </p>
                          {song.genre && (
                            <p className="text-gray-500 text-xs truncate">{formatGenres(song.genre)}</p>
                          )}
                          {/* Show related artist and album info */}
                          {(song.relatedArtist || song.relatedAlbum) && (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {song.relatedArtist && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                                  <IconMicrophone size={10} />
                                  {song.relatedArtist.name}
                                </span>
                              )}
                              {song.relatedAlbum && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                                  <IconDisc size={10} />
                                  {song.relatedAlbum.name}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-gray-400 text-xs sm:text-sm flex-shrink-0">
                          {formatDuration(song.duration)}
                        </div>
                      </motion.div>
                    ))}
                    {searchResults.songs.length > 5 && (
                      <div className="text-center text-gray-400 text-sm py-2">
                        +{searchResults.songs.length - 5} more songs
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Albums Results */}
              {searchResults.albums.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <IconDisc size={18} />
                    Albums ({searchResults.albums.length})
                  </h3>
                  <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {searchResults.albums.slice(0, 10).map((album: any) => (
                      <motion.div
                        key={album.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group cursor-pointer"
                        onClick={() => handleAlbumClick(album)}
                      >
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                          <div className="relative mb-3">
                            <img
                              src={album.thumbnail}
                              alt={album.name}
                              className="w-full aspect-square rounded-lg object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                              }}
                            />
                            <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <IconPlayerPlay size={20} className="text-white" />
                            </button>
                          </div>
                          <h4 className="font-semibold text-white truncate text-sm">{album.name}</h4>
                          <p className="text-gray-400 text-xs truncate">{album.artist}</p>
                          <p className="text-gray-500 text-xs">
                            {album.songs?.length || 0} songs
                          </p>
                          
                          {/* Show related artist info */}
                          {album.relatedArtist && (
                            <div className="mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                                <IconMicrophone size={10} />
                                Artist
                              </span>
                            </div>
                          )}
                          
                          {/* Show top songs from album */}
                          {album.topSongs && album.topSongs.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <p className="text-xs text-gray-500 mb-1">Top Songs:</p>
                              {album.topSongs.slice(0, 2).map((song: any, idx: number) => (
                                <p key={song._id} className="text-xs text-gray-400 truncate">
                                  {idx + 1}. {song.title}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artists Results */}
              {searchResults.artists.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <IconMicrophone size={18} />
                    Artists ({searchResults.artists.length})
                  </h3>
                  <div className="grid gap-4 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {searchResults.artists.slice(0, 10).map((artist: any) => (
                      <motion.div
                        key={artist._id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group cursor-pointer"
                        onClick={() => handleArtistClick(artist)}
                      >
                        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                          <div className="relative mb-3">
                            <img
                              src={artist.thumbnail}
                              alt={artist.name}
                              className="w-full aspect-square rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                              }}
                            />
                          </div>
                          <h4 className="font-semibold text-white truncate text-sm text-center">{artist.name}</h4>
                          <p className="text-gray-400 text-xs text-center">
                            {artist.songCount} songs • {artist.albumCount} albums
                          </p>
                          {artist.genre && artist.genre.length > 0 && (
                            <p className="text-gray-500 text-xs text-center truncate">
                              {artist.genre.slice(0, 2).join(', ')}
                            </p>
                          )}
                          
                          {/* Show top songs */}
                          {artist.topSongs && artist.topSongs.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <p className="text-xs text-gray-500 mb-1">Top Songs:</p>
                              {artist.topSongs.slice(0, 3).map((song: any, idx: number) => (
                                <p key={song._id} className="text-xs text-gray-400 truncate">
                                  {idx + 1}. {song.title}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {/* Show top albums */}
                          {artist.relatedAlbums && artist.relatedAlbums.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                              <p className="text-xs text-gray-500 mb-1">Albums:</p>
                              {artist.relatedAlbums.slice(0, 2).map((albumInfo: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <IconDisc size={10} className="text-purple-400" />
                                  <p className="text-xs text-gray-400 truncate">{albumInfo.name}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchResults.songs.length === 0 && searchResults.albums.length === 0 && searchResults.artists.length === 0 && (
                <div className="text-center py-12">
                  <IconSearch size={48} className="text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No results found</h3>
                  <p className="text-gray-500">Try searching for a different song, artist, or album</p>
                </div>
              )}
            </div>
          )}

          {/* Default Search State */}
          {!searchTerm.trim() && (
            <div className="text-center py-12">
              <IconSearch size={48} className="text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">Search your music library</h3>
              <p className="text-gray-500">Find songs, albums, and artists instantly</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Use dedicated mobile main layout when not in artist/album detail and not search
  if (isMobile && !selectedArtist && !selectedAlbum && activeView !== 'search') {
    return renderMobileMainView();
  }

  return (
    <div className="flex-1 p-3 sm:p-4 md:p-6">
      {/* Fully responsive main layout */}
      <div className="mx-auto w-full max-w-screen-2xl grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 xl:grid-cols-12">
        {/* Main Content Area - responsive column span */}
        <div className="xl:col-span-8 2xl:col-span-9 min-w-0">
        {/* Header - responsive layout with space for mobile menu button */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 pr-16 lg:pr-0">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2 capitalize">
            {getViewIcon()}
            {activeView}
          </h2>
        </div>

  {/* Content Grid - desktop uses internal scroll; mobile uses page scroll */}
  <div className="xl:max-h-[75vh] xl:overflow-y-auto pb-20 xl:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={cn(
                (activeView === 'playlists' || activeView === 'favorites') 
                  ? "w-full" 
                  : cn(
                    "grid gap-3 sm:gap-4",
                    activeView === 'songs' 
                      ? "grid-cols-1" 
                      : "grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  )
              )}
            >
            {activeView === 'songs' && (
              <>
                {filteredData.map((song, index) => (
                  <motion.div
                    key={song._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all duration-200 cursor-pointer",
                      "bg-white/5 backdrop-blur-sm border border-white/10",
                      "hover:bg-white/10 hover:border-white/20",
                      currentSong?._id === song._id && "bg-blue-500/20 border-blue-400/50"
                    )}
                    onClick={() => onSongSelect(song, filteredData, 'songs')}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={song.thumbnailUrl}
                        alt={song.title}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (currentSong?._id === song._id) {
                            onPlayPause();
                          } else {
                            onSongSelect(song, filteredData, 'songs');
                          }
                        }}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {currentSong?._id === song._id && isPlaying ? (
                          <IconPlayerPause size={16} className="text-white" />
                        ) : (
                          <IconPlayerPlay size={16} className="text-white" />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate text-sm sm:text-base">{song.title}</h3>
                      <p className="text-gray-400 text-xs sm:text-sm truncate">
                        {formatArtists(song)} • {getSongType(song)}
                      </p>
                      {song.genre && (
                        <p className="text-gray-500 text-xs truncate">{song.genre}</p>
                      )}
                    </div>
                    
                    <div className="text-gray-400 text-xs sm:text-sm flex-shrink-0">
                      {formatDuration(song.duration)}
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {activeView === 'albums' && (
              <>
                {filteredData.map((album, index) => (
                  <motion.div
                    key={album.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group cursor-pointer"
                    onClick={() => handleAlbumClick(album)}
                  >
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                      <div className="relative mb-3 sm:mb-4">
                        <img
                          src={album.thumbnail}
                          alt={album.name}
                          className="w-full aspect-square rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                          }}
                        />
                        <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconPlayerPlay size={24} className="text-white sm:w-8 sm:h-8" />
                        </button>
                      </div>
                      <h3 className="font-semibold text-white truncate text-sm sm:text-base">{album.name}</h3>
                      <p className="text-gray-400 text-xs sm:text-sm truncate">{album.artist}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {(album.songs || []).length} songs • {formatDuration(album.duration || 0)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {activeView === 'artists' && (
              <>
                {filteredData.map((artist, index) => (
                  <motion.div
                    key={artist.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="group cursor-pointer"
                    onClick={() => handleArtistClick(artist)}
                  >
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
                      <div className="relative mb-3 sm:mb-4">
                        <img
                          src={artist.thumbnail}
                          alt={artist.name}
                          className="w-full aspect-square rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                          }}
                        />
                        <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <IconPlayerPlay size={24} className="text-white sm:w-8 sm:h-8" />
                        </button>
                      </div>
                      <h3 className="font-semibold text-white truncate text-sm sm:text-base">{artist.name}</h3>
                      <p className="text-gray-400 text-xs sm:text-sm">
                        {artist.songCount || 0} songs • {artist.albumCount || 0} albums
                      </p>
                      {(() => {
                        const artistGenres = Array.isArray(artist.genre)
                          ? (artist.genre as any[]).filter(Boolean)
                          : typeof artist.genre === 'string' && artist.genre.trim() !== ''
                          ? [artist.genre]
                          : [];
                        if (artistGenres.length === 0) return null;
                        const preview = artistGenres.slice(0, 2).join(', ');
                        const hasMore = artistGenres.length > 2;
                        return (
                          <p className="text-gray-300 text-xs truncate mt-1">
                            {preview}
                            {hasMore ? '...' : ''}
                          </p>
                        );
                      })()}
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {(activeView === 'playlists' || activeView === 'favorites') && (
              <div className="flex flex-col items-center justify-center px-4 py-12 min-h-[400px] w-full">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 sm:p-8 text-center w-full max-w-sm mx-auto shadow-xl"
                >
                  {activeView === 'playlists' ? (
                    <IconPlaylist size={48} className="text-blue-400 mx-auto mb-4" />
                  ) : (
                    <IconHeart size={48} className="text-red-400 mx-auto mb-4" />
                  )}
                  <h3 className="text-xl font-bold text-white mb-3">
                    {activeView === 'playlists' ? 'Playlists' : 'Favorites'}
                  </h3>
                  <p className="text-gray-300 mb-4 text-base leading-relaxed">
                    This feature will be available in future updates
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Stay tuned for playlist management and favorites functionality!
                  </p>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {filteredData.length === 0 && activeView !== 'playlists' && activeView !== 'favorites' && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">
              No {activeView} found
            </div>
          </div>
        )}
  </div>
  {/* end scroll container */}
  </div>

        {/* Currently Playing Section (right column) - responsive visibility and sizing */}
        <div className="hidden xl:block xl:col-span-4 2xl:col-span-3">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 sticky top-6">
            {currentSong ? (
              <>
                <h3 className="text-base font-semibold text-white mb-4">Now Playing</h3>
                
                {/* Album Art */}
                <div className="relative mb-4">
                  <img
                    src={currentSong.thumbnailUrl}
                    alt={currentSong.title}
                    className="w-full aspect-square rounded-lg object-cover shadow-xl"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-lg" />
                </div>

                {/* Song Info */}
                <div className="mb-4 text-center">
                  <h4 className="font-bold text-white text-base mb-1 truncate">{currentSong.title}</h4>
                  <p className="text-gray-300 text-sm mb-1 truncate">{formatArtists(currentSong)}</p>
                  <p className="text-gray-400 text-xs truncate">{getSongType(currentSong)}</p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatDuration(currentSong.duration)}</span>
                  </div>
                  <div 
                    className="relative bg-gray-700 rounded-full h-1 cursor-pointer group"
                    onClick={handleProgressClick}
                  >
                    <div 
                      className="absolute top-0 left-0 bg-green-500 rounded-full h-1 transition-all duration-100"
                      style={{ 
                        width: currentSong.duration > 0 
                          ? `${(currentTime / currentSong.duration) * 100}%` 
                          : '0%' 
                      }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ 
                        left: currentSong.duration > 0 
                          ? `calc(${(currentTime / currentSong.duration) * 100}% - 6px)` 
                          : '-6px' 
                      }}
                    />
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    onClick={onPrevious}
                    disabled={!canGoPrevious}
                    className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <IconPlayerSkipBack size={20} />
                  </button>
                  
                  <button
                    onClick={onPlayPause}
                    className="p-2.5 bg-green-600 hover:bg-green-700 rounded-full text-white transition-colors"
                  >
                    {isPlaying ? <IconPlayerPause size={24} /> : <IconPlayerPlay size={24} />}
                  </button>
                  
                  <button
                    onClick={onNext}
                    disabled={!canGoNext}
                    className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <IconPlayerSkipForward size={20} />
                  </button>
                </div>

                {/* Volume Control */}
                <div className="mb-4">
                  <div className="flex items-center gap-3">
                    {volume === 0 ? <IconVolumeOff size={14} className="text-gray-400" /> : <IconVolume size={14} className="text-gray-400" />}
                    <div 
                      className="flex-1 relative bg-gray-700 rounded-full h-1 cursor-pointer group"
                      onClick={handleVolumeChange}
                    >
                      <div 
                        className="absolute top-0 left-0 bg-white rounded-full h-1 transition-all duration-100"
                        style={{ width: `${volume * 100}%` }}
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `calc(${volume * 100}% - 6px)` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-8">{Math.round(volume * 100)}%</span>
                  </div>
                </div>

                {/* Song Info */}
                <div className="border-t border-white/10 pt-4">
                  <div className="text-xs text-gray-400 space-y-2">
                    <div className="flex justify-between">
                      <span>Genre:</span>
                      <span className="text-gray-300">{formatGenres(currentSong.genre)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="text-gray-300">{formatDuration(currentSong.duration)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold text-white mb-4">Music Player</h3>
                
                {/* Placeholder Album Art */}
                <div className="relative mb-4">
                  <div className="w-full aspect-square rounded-lg bg-gray-800/50 flex items-center justify-center">
                    <IconMusic size={40} className="text-gray-600" />
                  </div>
                </div>

                {/* Placeholder Info */}
                <div className="mb-4 text-center">
                  <h4 className="font-bold text-gray-500 text-base mb-1">No song selected</h4>
                  <p className="text-gray-600 text-sm mb-1">Choose a song to start playing</p>
                </div>

                {/* Disabled Controls */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <button
                    disabled
                    className="p-2 text-gray-600 cursor-not-allowed"
                  >
                    <IconPlayerSkipBack size={20} />
                  </button>
                  
                  <button
                    disabled
                    className="p-2.5 bg-gray-700 rounded-full text-gray-600 cursor-not-allowed"
                  >
                    <IconPlayerPlay size={24} />
                  </button>
                  
                  <button
                    disabled
                    className="p-2 text-gray-600 cursor-not-allowed"
                  >
                    <IconPlayerSkipForward size={20} />
                  </button>
                </div>

                {/* Welcome Message */}
                <div className="text-center text-gray-500 text-sm">
                  Select any song from the library to start your music experience
                </div>
              </>
            )}
          </div>
        </div>
      </div>

  {/* Mobile mini player rendered centrally in dashboard */}

      {/* Mobile Now Playing Sheet - responsive design */}
      {currentSong && showMobileNowPlaying && (
        <div className="xl:hidden fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-md">
          <div className="p-3 sm:p-4 flex items-center justify-between">
            <h3 className="text-white/90 font-semibold text-base sm:text-lg">Now Playing</h3>
            <button
              onClick={() => setShowMobileNowPlaying(false)}
              className="p-2 rounded-lg bg-white/10 text-white/90 hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <IconX size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex-1 overflow-y-auto">
            <img
              src={currentSong.thumbnailUrl}
              alt={currentSong.title}
              className="w-full max-w-xs sm:max-w-sm mx-auto aspect-square rounded-2xl object-cover shadow-2xl"
              onError={(e) => { (e.target as HTMLImageElement).src = '/default-thumbnail.svg'; }}
            />
            <div className="mt-4 sm:mt-6 text-center">
              <div className="text-white text-lg sm:text-xl font-semibold truncate px-4">{currentSong.title}</div>
              <div className="text-gray-300 text-sm sm:text-base truncate px-4">{formatArtists(currentSong)}</div>
              <div className="text-gray-400 text-xs sm:text-sm truncate px-4">{getSongType(currentSong)}</div>
            </div>
            <div className="mt-4 sm:mt-6 px-2">
              <div className="flex justify-between text-xs sm:text-sm text-gray-400 mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatDuration(currentSong.duration)}</span>
              </div>
              <div className="relative bg-white/20 rounded-full h-1.5 sm:h-2" onClick={handleProgressClick}>
                <div
                  className="absolute left-0 top-0 h-1.5 sm:h-2 bg-green-500 rounded-full transition-all duration-100"
                  style={{ width: currentSong.duration > 0 ? `${(currentTime / currentSong.duration) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div className="mt-6 sm:mt-8 flex items-center justify-center gap-4 sm:gap-6">
              <button 
                onClick={onPrevious} 
                className="p-2 sm:p-3 text-white/90 hover:bg-white/10 rounded-full transition-colors" 
                aria-label="Previous"
              >
                <IconPlayerSkipBack size={24} className="sm:w-7 sm:h-7" />
              </button>
              <button 
                onClick={onPlayPause} 
                className="p-3 sm:p-4 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors shadow-lg" 
                aria-label="Play/Pause"
              >
                {isPlaying ? <IconPlayerPause size={28} className="sm:w-8 sm:h-8" /> : <IconPlayerPlay size={28} className="sm:w-8 sm:h-8" />}
              </button>
              <button 
                onClick={onNext} 
                className="p-2 sm:p-3 text-white/90 hover:bg-white/10 rounded-full transition-colors" 
                aria-label="Next"
              >
                <IconPlayerSkipForward size={24} className="sm:w-7 sm:h-7" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
