'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconVolume,
  IconVolumeOff,
  IconRepeat,
  IconArrowsShuffle,
  IconHeart,
  IconChevronUp,
  IconChevronDown
} from '@tabler/icons-react';

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

interface MusicPlayerProps {
  currentSong: Music | null;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
}

export default function MusicPlayer({
  currentSong,
  isPlaying,
  audioRef,
  onPlayPause,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
}: MusicPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => !isDragging && setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const updateVolume = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('volumechange', updateVolume);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('volumechange', updateVolume);
    };
  }, [audioRef, isDragging]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    audio.currentTime = newTime;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audio.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  if (!currentSong) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-white/10 z-50"
      >
        {/* Expanded View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-6 py-4 border-b border-white/10"
            >
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* Large Album Art */}
                  <div className="flex-shrink-0">
                    <img
                      src={currentSong.thumbnailUrl}
                      alt={currentSong.title}
                      className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover shadow-2xl"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                      }}
                    />
                  </div>

                  {/* Song Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-bold text-white mb-2">{currentSong.title}</h2>
                    <p className="text-lg text-gray-300 mb-1">{currentSong.artist}</p>
                    <p className="text-gray-400">{currentSong.album}</p>
                  </div>

                  {/* Additional Controls */}
                  <div className="flex items-center gap-4">
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      <IconArrowsShuffle size={20} className="text-gray-400" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      <IconRepeat size={20} className="text-gray-400" />
                    </button>
                    <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      <IconHeart size={20} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Player */}
        <div className="px-4 py-3">
          <div className="max-w-6xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                <span>{formatTime(currentTime)}</span>
                <div className="flex-1 relative">
                  <div className="w-full h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex items-center justify-between">
              {/* Song Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={currentSong.thumbnailUrl}
                  alt={currentSong.title}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/default-thumbnail.svg';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-white truncate text-sm">{currentSong.title}</h3>
                  <p className="text-gray-400 text-xs truncate">{currentSong.artist}</p>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onPrevious}
                  disabled={!canGoPrevious}
                  className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <IconPlayerSkipBack size={18} />
                </button>

                <button
                  onClick={onPlayPause}
                  className="p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-colors"
                >
                  {isPlaying ? <IconPlayerPause size={20} /> : <IconPlayerPlay size={20} />}
                </button>

                <button
                  onClick={onNext}
                  disabled={!canGoNext}
                  className="p-2 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <IconPlayerSkipForward size={18} />
                </button>
              </div>

              {/* Volume & Expand */}
              <div className="flex items-center gap-2 flex-1 justify-end">
                {/* Volume Control (Desktop) */}
                <div className="hidden md:flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <IconVolumeOff size={18} className="text-gray-400" />
                    ) : (
                      <IconVolume size={18} className="text-gray-400" />
                    )}
                  </button>
                  <div className="w-20 relative">
                    <div className="w-full h-1 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white transition-all duration-150"
                        style={{ width: `${volume * 100}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Expand Button */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  {isExpanded ? (
                    <IconChevronDown size={18} className="text-gray-400" />
                  ) : (
                    <IconChevronUp size={18} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
