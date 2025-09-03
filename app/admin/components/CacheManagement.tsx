'use client';

import { useState, useEffect } from 'react';

interface CacheStats {
  totalFiles: number;
  totalSize: number;
  oldestFile: string | null;
  newestFile: string | null;
  cacheHitRate: number;
}

export default function CacheManagement() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/cache/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    }
  };

  const clearCache = async () => {
    if (!confirm('Are you sure you want to clear all cached audio files?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Cleared ${data.deletedCount} cached files`);
        fetchStats();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Error clearing cache');
    } finally {
      setLoading(false);
    }
  };

  const clearOldCache = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/cache/clear-old', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Cleared ${data.deletedCount} old cached files`);
        fetchStats();
      }
    } catch (error) {
      console.error('Error clearing old cache:', error);
      alert('Error clearing old cache');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 shadow-xl">
      <h3 className="text-xl font-bold mb-4">Audio Cache Management</h3>
      
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700/70 backdrop-blur-sm p-4 rounded-lg">
            <h4 className="text-sm text-gray-400">Cached Files</h4>
            <p className="text-2xl font-bold text-blue-400">{stats.totalFiles}</p>
          </div>
          
          <div className="bg-gray-700/70 backdrop-blur-sm p-4 rounded-lg">
            <h4 className="text-sm text-gray-400">Cache Size</h4>
            <p className="text-2xl font-bold text-green-400">{stats.totalSize} MB</p>
          </div>
          
          <div className="bg-gray-700/70 backdrop-blur-sm p-4 rounded-lg">
            <h4 className="text-sm text-gray-400">Oldest File</h4>
            <p className="text-sm text-gray-300">{stats.oldestFile || 'None'}</p>
          </div>
          
          <div className="bg-gray-700/70 backdrop-blur-sm p-4 rounded-lg">
            <h4 className="text-sm text-gray-400">Newest File</h4>
            <p className="text-sm text-gray-300">{stats.newestFile || 'None'}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <button
          onClick={fetchStats}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          disabled={loading}
        >
          Refresh Stats
        </button>
        
        <button
          onClick={clearOldCache}
          className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded-lg transition-colors"
          disabled={loading}
        >
          Clear Old Cache (24h+)
        </button>
        
        <button
          onClick={clearCache}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          disabled={loading}
        >
          Clear All Cache
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-700/50 backdrop-blur-sm rounded-lg">
        <h4 className="font-semibold mb-2">Performance Tips:</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Frequently played songs are automatically cached to disk for instant loading</li>
          <li>• First-time loads may take a moment as files are retrieved from MongoDB</li>
          <li>• Cached files are stored locally and cleared after 24 hours</li>
          <li>• Use "Preload" button on songs to cache them before playing</li>
        </ul>
      </div>
    </div>
  );
}
