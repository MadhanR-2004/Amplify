'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  IconSettings, 
  IconLogout,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconX,
  IconShield
} from '@tabler/icons-react';
import GradientBackground from '@/components/GradientBackground';
import SettingsModal from '@/components/SettingsModal';
import { FloatingDock, musicDockItems } from '@/components/FloatingDock';
import MusicBrowser from '@/components/MusicBrowser';
import { useMusicStats } from '@/hooks/useMusicStats';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
}

interface Music {
  _id: string;
  title: string;
  artist: string;
  album: string;
  genre: string | string[];
  duration: number;
  thumbnailUrl: string;
  fileUrl: string;
  createdAt: string;
}

interface Playlist {
  _id: string;
  name: string;
  description: string;
  songs: string[];
  isPublic: boolean;
  createdAt: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [music, setMusic] = useState<Music[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSong, setCurrentSong] = useState<Music | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [activeView, setActiveView] = useState('songs');
  const [autoPlayTriggered, setAutoPlayTriggered] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Music[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [lastCurrentTime, setLastCurrentTime] = useState(0);
  const [stallCheckCount, setStallCheckCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [npCurrentTime, setNpCurrentTime] = useState(0);
  const [npDuration, setNpDuration] = useState(0);
  const currentPlaylistRef = useRef<Music[]>([]);
  const currentSongIndexRef = useRef(0);
  const router = useRouter();
  const { stats, refetch: refetchStats } = useMusicStats();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchMusic();
      fetchPlaylists();
    }
  }, [user]);

  // Keep refs in sync with state for reliable auto-play
  useEffect(() => {
    currentPlaylistRef.current = currentPlaylist;
  }, [currentPlaylist]);

  useEffect(() => {
    currentSongIndexRef.current = currentSongIndex;
  }, [currentSongIndex]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/auth/login');
      }
    } catch (error) {
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchMusic = async () => {
    try {
      const response = await fetch('/api/music');
      if (response.ok) {
        const data = await response.json();
        setMusic(data.music || []);
      }
    } catch (error) {
      console.error('Error fetching music:', error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await fetch('/api/playlists');
      if (response.ok) {
        const data = await response.json();
        setPlaylists(data.playlists || []);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPlaylistName,
          description: '',
          isPublic: false,
        }),
      });

      if (response.ok) {
        setShowCreatePlaylist(false);
        setNewPlaylistName('');
        fetchPlaylists();
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const playSong = (song: Music) => {
    if (audioRef.current) {
      if (currentSong?._id === song._id && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        console.log('Playing song:', song.title);
        setCurrentSong(song);
        setAutoPlayTriggered(false); // Reset auto-play flag for new song
        setLastCurrentTime(0); // Reset time tracking
        setStallCheckCount(0); // Reset stall counter
        
        audioRef.current.src = song.fileUrl;
        audioRef.current.play().catch((error) => {
          console.error('Error playing song:', error);
          setIsPlaying(false);
        });
        setIsPlaying(true);
        
        // Update current playlist and index - ensure we're working with the current playlist
        if (currentPlaylist.length > 0) {
          const songIndex = currentPlaylist.findIndex(s => s._id === song._id);
          if (songIndex !== -1) {
            setCurrentSongIndex(songIndex);
            console.log('Updated song index to:', songIndex, 'in playlist of', currentPlaylist.length, 'songs');
          }
        }
      }
    }
  };

  const playNextSong = () => {
    const playlist = currentPlaylistRef.current;
    const songIndex = currentSongIndexRef.current;
    
    console.log('playNextSong called. Playlist length:', playlist.length, 'Current index:', songIndex);
    if (playlist.length > 0 && songIndex < playlist.length - 1) {
      const nextIndex = songIndex + 1;
      const nextSong = playlist[nextIndex];
      console.log('Playing next song:', nextSong.title, 'at index:', nextIndex);
      
      setCurrentSongIndex(nextIndex);
      setCurrentSong(nextSong);
      setAutoPlayTriggered(false); // Reset flag for next song
      setLastCurrentTime(0); // Reset time tracking
      setStallCheckCount(0); // Reset stall counter
      
      if (audioRef.current) {
        audioRef.current.src = nextSong.fileUrl;
        audioRef.current.play().catch((error) => {
          console.error('Error playing next song:', error);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    } else {
      console.log('Cannot play next song - reached end or playlist empty. Index:', songIndex, 'Playlist length:', playlist.length);
    }
  };

  const playPreviousSong = () => {
    const playlist = currentPlaylistRef.current;
    const songIndex = currentSongIndexRef.current;
    
    if (playlist.length > 0 && songIndex > 0) {
      const prevIndex = songIndex - 1;
      const prevSong = playlist[prevIndex];
      console.log('Playing previous song:', prevSong.title, 'at index:', prevIndex);
      
      setCurrentSongIndex(prevIndex);
      setCurrentSong(prevSong);
      setAutoPlayTriggered(false); // Reset flag for previous song
      setLastCurrentTime(0); // Reset time tracking
      setStallCheckCount(0); // Reset stall counter
      
      if (audioRef.current) {
        audioRef.current.src = prevSong.fileUrl;
        audioRef.current.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      }
    }
  };

  const handleSongEnd = useCallback(() => {
    const playlist = currentPlaylistRef.current;
    const songIndex = currentSongIndexRef.current;
    
    console.log('Song ended! Current playlist length:', playlist.length, 'Current index:', songIndex);
    setIsPlaying(false);
    setAutoPlayTriggered(false); // Reset the flag when song ends
    
    // Auto-play next song if available
    if (playlist.length > 0 && songIndex < playlist.length - 1) {
      const nextIndex = songIndex + 1;
      const nextSong = playlist[nextIndex];
      
      console.log('Auto-playing next song... Current index:', songIndex, 'Next index:', nextIndex);
      console.log('Next song:', nextSong?.title);
      
      if (nextSong) {
        // Use a small timeout to ensure state updates are processed
        setTimeout(() => {
          console.log('Setting next song:', nextSong.title);
          setCurrentSongIndex(nextIndex);
          setCurrentSong(nextSong);
          setLastCurrentTime(0); // Reset time tracking
          setStallCheckCount(0); // Reset stall counter
          
          if (audioRef.current) {
            audioRef.current.src = nextSong.fileUrl;
            audioRef.current.play().catch((error) => {
              console.error('Auto-play error:', error);
              setIsPlaying(false);
            });
            setIsPlaying(true);
          }
        }, 100);
      }
    } else {
      console.log('No next song available or reached end of playlist. Index:', songIndex, 'Length:', playlist.length);
    }
  }, [audioRef]);

  const togglePlayPause = () => {
    if (audioRef.current && currentSong) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      }
    }
  };

  // Now Playing Sheet: sync time/duration
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setNpCurrentTime(audio.currentTime || 0);
    const onLoaded = () => setNpDuration(audio.duration || 0);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    onLoaded();
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [audioRef, currentSong]);

  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleProgressSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !npDuration) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const pos = Math.min(Math.max(0, e.clientX - rect.left), rect.width) / rect.width;
    const newTime = pos * npDuration;
    audio.currentTime = newTime;
    setNpCurrentTime(newTime);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredMusic = music.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.album.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSongSelect = (song: Music, playlist?: Music[], playlistType?: string) => {
    console.log('Song selected:', song.title, 'Playlist provided:', !!playlist, 'Type:', playlistType);
    
    // First set the playlist and index, then play the song
    if (playlist && playlist.length > 0) {
      console.log('Setting playlist with', playlist.length, 'songs:', playlist.map(s => s.title));
      setCurrentPlaylist(playlist);
      const songIndex = playlist.findIndex(s => s._id === song._id);
      console.log('Song index in provided playlist:', songIndex);
      setCurrentSongIndex(songIndex !== -1 ? songIndex : 0);
    } else {
      console.log('Using all music as playlist with', music.length, 'songs');
      // If no playlist provided, use all music as default playlist
      setCurrentPlaylist(music);
      const songIndex = music.findIndex(s => s._id === song._id);
      console.log('Song index in all music:', songIndex);
      setCurrentSongIndex(songIndex !== -1 ? songIndex : 0);
    }
    
    // Play the song after setting up the playlist
    playSong(song);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="spinner"></div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
  <div className="min-h-screen text-white flex flex-col">
        {/* Top Navigation */}
        <div className="p-4">
          <FloatingDock
            items={(() => {
              const base = musicDockItems.map(item => ({
                ...item,
                count: item.id === 'songs' ? stats.totalSongs :
                       item.id === 'albums' ? stats.totalAlbums :
                       item.id === 'artists' ? stats.totalArtists :
                       item.id === 'playlists' ? stats.totalPlaylists :
                       item.id === 'favorites' ? stats.favorites :
                       undefined,
                onClick: () => {
                  if (['songs','albums','artists','playlists','favorites','search'].includes(item.id)) {
                    setActiveView(item.id);
                  } else if (item.id === 'settings') {
                    setIsSettingsOpen(true);
                  }
                }
              }));

              if (user?.role === 'admin') {
                base.push({
                  id: 'admin',
                  title: 'Admin',
                  icon: <IconShield size={24} />,
                  onClick: () => router.push('/admin'),
                  count: undefined
                });
              }

              base.push({
                id: 'logout',
                title: `Logout (${user?.username})`,
                icon: <IconLogout size={24} />,
                onClick: handleLogout,
                count: undefined
              });

              return base;
            })()}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 pb-20 xl:pb-0">
          <MusicBrowser
            activeView={activeView}
            music={music}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onSongSelect={handleSongSelect}
            onPlayPause={togglePlayPause}
            onNext={playNextSong}
            onPrevious={playPreviousSong}
            canGoNext={currentPlaylist.length > 0 && currentSongIndex < currentPlaylist.length - 1}
            canGoPrevious={currentPlaylist.length > 0 && currentSongIndex > 0}
            audioRef={audioRef}
          />
        </div>

        {/* Unified Mobile Mini Player (always present on mobile) */}
    {currentSong && (
          <div className="xl:hidden fixed left-0 right-0 bottom-0 z-50 px-2 sm:px-3 pb-[env(safe-area-inset-bottom)]">
            <button
      onClick={() => setIsNowPlayingOpen(true)}
              className="w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-t-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg active:scale-[0.99] transition-transform"
            >
              <img
                src={currentSong.thumbnailUrl}
                alt={currentSong.title}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-md object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/default-thumbnail.svg'; }}
              />
              <div className="flex-1 min-w-0 text-left">
                <div className="text-white font-medium truncate text-sm sm:text-base">{currentSong.title}</div>
                <div className="text-xs text-gray-300 truncate">{currentSong.artist}</div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); playPreviousSong(); }}
                  className="p-1 sm:p-1.5 text-white/80 rounded-md hover:bg-white/10 transition-colors"
                  aria-label="Previous"
                >
                  <IconPlayerSkipBack size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                  className="p-1.5 sm:p-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                  aria-label="Play/Pause"
                >
                  {isPlaying ? <IconPlayerPause size={18} className="sm:w-5 sm:h-5" /> : <IconPlayerPlay size={18} className="sm:w-5 sm:h-5" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); playNextSong(); }}
                  className="p-1 sm:p-1.5 text-white/80 rounded-md hover:bg-white/10 transition-colors"
                  aria-label="Next"
                >
                  <IconPlayerSkipForward size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>
            </button>
          </div>
        )}

        {/* Mobile Now Playing Sheet */}
        {currentSong && isNowPlayingOpen && (
          <div className="xl:hidden fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-md">
            <div className="p-3 sm:p-4 flex items-center justify-between">
              <h3 className="text-white/90 font-semibold text-base sm:text-lg">Now Playing</h3>
              <button
                onClick={() => setIsNowPlayingOpen(false)}
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
                <div className="text-gray-300 text-sm sm:text-base truncate px-4">{currentSong.artist}</div>
              </div>
              <div className="mt-4 sm:mt-6 px-2">
                <div className="flex justify-between text-xs sm:text-sm text-gray-400 mb-2">
                  <span>{formatTime(npCurrentTime)}</span>
                  <span>{formatTime(npDuration)}</span>
                </div>
                <div className="relative bg-white/20 rounded-full h-1.5 sm:h-2" onClick={handleProgressSeek}>
                  <div
                    className="absolute left-0 top-0 h-1.5 sm:h-2 bg-green-500 rounded-full transition-all duration-100"
                    style={{ width: npDuration ? `${(npCurrentTime / npDuration) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div className="mt-6 sm:mt-8 flex items-center justify-center gap-4 sm:gap-6">
                <button 
                  onClick={playPreviousSong} 
                  className="p-2 sm:p-3 text-white/90 hover:bg-white/10 rounded-full transition-colors" 
                  aria-label="Previous"
                >
                  <IconPlayerSkipBack size={24} className="sm:w-7 sm:h-7" />
                </button>
                <button 
                  onClick={togglePlayPause} 
                  className="p-3 sm:p-4 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors shadow-lg" 
                  aria-label="Play/Pause"
                >
                  {isPlaying ? <IconPlayerPause size={28} className="sm:w-8 sm:h-8" /> : <IconPlayerPlay size={28} className="sm:w-8 sm:h-8" />}
                </button>
                <button 
                  onClick={playNextSong} 
                  className="p-2 sm:p-3 text-white/90 hover:bg-white/10 rounded-full transition-colors" 
                  aria-label="Next"
                >
                  <IconPlayerSkipForward size={24} className="sm:w-7 sm:h-7" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          onEnded={handleSongEnd}
          onPlay={() => {
            console.log('Audio play event triggered');
            setIsPlaying(true);
          }}
          onPause={() => {
            console.log('Audio pause event triggered');
            setIsPlaying(false);
          }}
          onLoadStart={() => console.log('Audio load start')}
          onCanPlay={() => console.log('Audio can play')}
          onError={(e) => {
            console.error('Audio error:', e);
            setIsPlaying(false);
          }}
          onTimeUpdate={() => {
            if (audioRef.current && currentSong && !autoPlayTriggered) {
              const current = audioRef.current.currentTime;
              const duration = audioRef.current.duration;
              const playlist = currentPlaylistRef.current;
              const songIndex = currentSongIndexRef.current;
              
              // Check if playback is stuck near the end (hasn't progressed in the last second)
              if (duration && current && (duration - current < 2.0) && Math.abs(current - lastCurrentTime) < 0.1) {
                setStallCheckCount(prev => prev + 1);
                
                // If stalled for more than 3 consecutive checks (about 3 seconds) near the end
                if (stallCheckCount > 3 && playlist.length > 0 && songIndex < playlist.length - 1) {
                  console.log('Audio stalled near end. Current:', current.toFixed(2), 'Duration:', duration.toFixed(2), 'Stall count:', stallCheckCount);
                  setAutoPlayTriggered(true);
                  setStallCheckCount(0);
                  handleSongEnd();
                  return;
                }
              } else {
                setStallCheckCount(0); // Reset if playback is progressing
              }
              
              setLastCurrentTime(current);
              
              // Check if we're very close to the end (within 1 second) as a backup
              // This helps with songs that don't reach the exact end due to buffering issues
              if (duration && current && (duration - current < 1.0) && (duration - current > 0) && !audioRef.current.paused && isPlaying) {
                // Only trigger if there's a next song available and we haven't triggered yet
                if (playlist.length > 0 && songIndex < playlist.length - 1) {
                  console.log('Backup auto-play trigger. Current:', current.toFixed(2), 'Duration:', duration.toFixed(2), 'Remaining:', (duration - current).toFixed(2));
                  setAutoPlayTriggered(true); // Prevent multiple triggers
                  handleSongEnd();
                }
              }
            }
          }}
        />

        {/* Settings Modal */}
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </div>
    </GradientBackground>
  );
}
