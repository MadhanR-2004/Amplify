'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { IconX, IconPlayerPlay, IconPlayerPause } from '@tabler/icons-react';

interface Music {
  _id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  thumbnailUrl: string;
  fileUrl: string;
  createdAt: string;
}

interface AlbumModalProps {
  isOpen: boolean;
  albumName: string;
  artistName: string;
  onClose: () => void;
  onSongSelect: (song: Music) => void;
  currentSong: Music | null;
  isPlaying: boolean;
}

export default function AlbumModal({
  isOpen,
  albumName,
  artistName,
  onClose,
  onSongSelect,
  currentSong,
  isPlaying,
}: AlbumModalProps) {
  const [albumSongs, setAlbumSongs] = useState<Music[]>([]);
  const [loading, setLoading] = useState(false);
  const [albumInfo, setAlbumInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen && albumName) {
      fetchAlbumSongs();
    }
  }, [isOpen, albumName]);

  const fetchAlbumSongs = async () => {
    setLoading(true);
    try {
      // Fetch all music and filter by album
      const musicResponse = await fetch('/api/music');
      if (musicResponse.ok) {
        const musicData = await musicResponse.json();
        const allMusic = musicData.music || [];
        const albumSongs = allMusic.filter((song: Music) => 
          song.album === albumName && song.artist === artistName
        );
        setAlbumSongs(albumSongs);
      }

      // Try to fetch album details if available
      try {
        const albumResponse = await fetch('/api/admin/albums');
        if (albumResponse.ok) {
          const albumData = await albumResponse.json();
          const albums = albumData.albums || [];
          const album = albums.find((a: any) => 
            a.title === albumName || a.title.toLowerCase() === albumName.toLowerCase()
          );
          setAlbumInfo(album);
        }
      } catch (error) {
        console.log('Album details not available');
      }
    } catch (error) {
      console.error('Error fetching album songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    return albumSongs.reduce((total, song) => total + song.duration, 0);
  };

  const getAlbumCover = () => {
    if (albumInfo?.coverUrl) return albumInfo.coverUrl;
    if (albumSongs.length > 0) return albumSongs[0].thumbnailUrl;
    return '/default-thumbnail.svg';
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-6 mb-6">
          <img
            src={getAlbumCover()}
            alt={albumName}
            className="w-32 h-32 rounded-xl object-cover shadow-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
            }}
          />
          
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">{albumName}</h2>
            <p className="text-xl text-gray-300 mb-3">by {artistName}</p>
            
            {albumInfo && (
              <>
                <p className="text-gray-400 text-sm mb-3">{albumInfo.description}</p>
                <div className="flex gap-2 mb-3">
                  {albumInfo.genre?.map((genre: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded-full text-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
                {albumInfo.releaseDate && (
                  <p className="text-gray-500 text-sm">
                    Released: {new Date(albumInfo.releaseDate).toLocaleDateString()}
                  </p>
                )}
              </>
            )}
            
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
              <span>{albumSongs.length} songs</span>
              <span>•</span>
              <span>{Math.floor(getTotalDuration() / 60)} minutes</span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <IconX size={24} />
          </button>
        </div>

        {/* Songs List */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Songs</h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : albumSongs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No songs found in this album</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {albumSongs.map((song, index) => (
                <motion.div
                  key={song._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`group flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-all ${
                    currentSong?._id === song._id ? 'bg-blue-600/20' : ''
                  }`}
                  onClick={() => onSongSelect(song)}
                >
                  <div className="w-8 h-8 flex items-center justify-center text-sm text-gray-400 group-hover:text-white">
                    {currentSong?._id === song._id && isPlaying ? (
                      <IconPlayerPause size={16} />
                    ) : (
                      <span className="group-hover:hidden">{index + 1}</span>
                    )}
                    {currentSong?._id !== song._id && (
                      <IconPlayerPlay size={16} className="hidden group-hover:block" />
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
                    <h4 className={`font-medium truncate ${
                      currentSong?._id === song._id ? 'text-blue-300' : 'text-white'
                    }`}>
                      {song.title}
                    </h4>
                    <p className="text-sm text-gray-400 truncate">{song.artist}</p>
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    {formatDuration(song.duration)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 pt-4 mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Total: {albumSongs.length} songs, {Math.floor(getTotalDuration() / 60)} minutes
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
