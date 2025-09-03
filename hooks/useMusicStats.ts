'use client';

import { useState, useEffect } from 'react';

interface MusicStats {
  totalSongs: number;
  totalAlbums: number;
  totalArtists: number;
  totalPlaylists: number;
  favorites: number;
}

export function useMusicStats() {
  const [stats, setStats] = useState<MusicStats>({
    totalSongs: 0,
    totalAlbums: 0,
    totalArtists: 0,
    totalPlaylists: 0,
    favorites: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMusicStats();
  }, []);

  const fetchMusicStats = async () => {
    try {
      setLoading(true);

      // Fetch stats from the dedicated stats API endpoint
      const response = await fetch('/api/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        throw new Error(data.message || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching music stats:', error);
      // Fallback to zeros if API fails
      setStats({
        totalSongs: 0,
        totalAlbums: 0,
        totalArtists: 0,
        totalPlaylists: 0,
        favorites: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchMusicStats };
}
