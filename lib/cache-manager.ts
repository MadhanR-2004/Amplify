import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.audio-cache');

export interface CacheStats {
  totalFiles: number;
  totalSize: number;
  oldestFile: string | null;
  newestFile: string | null;
  cacheHitRate: number;
}

export function getCacheStats(): CacheStats {
  if (!fs.existsSync(CACHE_DIR)) {
    return {
      totalFiles: 0,
      totalSize: 0,
      oldestFile: null,
      newestFile: null,
      cacheHitRate: 0,
    };
  }

  const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.mp3'));
  let totalSize = 0;
  let oldestTime = Date.now();
  let newestTime = 0;
  let oldestFile = null;
  let newestFile = null;

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;

    if (stats.mtime.getTime() < oldestTime) {
      oldestTime = stats.mtime.getTime();
      oldestFile = file;
    }

    if (stats.mtime.getTime() > newestTime) {
      newestTime = stats.mtime.getTime();
      newestFile = file;
    }
  }

  return {
    totalFiles: files.length,
    totalSize: Math.round(totalSize / 1024 / 1024 * 100) / 100, // MB
    oldestFile,
    newestFile,
    cacheHitRate: 0, // Would need to track this in the API
  };
}

export function clearCache(): number {
  if (!fs.existsSync(CACHE_DIR)) {
    return 0;
  }

  const files = fs.readdirSync(CACHE_DIR);
  let deletedCount = 0;

  for (const file of files) {
    try {
      fs.unlinkSync(path.join(CACHE_DIR, file));
      deletedCount++;
    } catch (error) {
      console.error(`Error deleting cache file ${file}:`, error);
    }
  }

  return deletedCount;
}

export function clearOldCache(maxAgeHours = 24): number {
  if (!fs.existsSync(CACHE_DIR)) {
    return 0;
  }

  const maxAge = maxAgeHours * 60 * 60 * 1000;
  const now = Date.now();
  const files = fs.readdirSync(CACHE_DIR);
  let deletedCount = 0;

  for (const file of files) {
    const filePath = path.join(CACHE_DIR, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    } catch (error) {
      console.error(`Error processing cache file ${file}:`, error);
    }
  }

  return deletedCount;
}

export function preloadPopularTracks(trackIds: string[]): Promise<void[]> {
  // This would be called to preload frequently accessed tracks
  const promises = trackIds.map(async (trackId) => {
    try {
      // Make a request to cache the track
      await fetch(`/api/audio/cached/${trackId}`, {
        method: 'HEAD', // Just get headers to trigger caching
      });
    } catch (error) {
      console.error(`Error preloading track ${trackId}:`, error);
    }
  });

  return Promise.all(promises);
}
