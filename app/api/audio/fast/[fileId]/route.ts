import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

// In-memory cache for frequently accessed audio chunks
const audioCache = new Map<string, { data: Buffer; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
): Promise<NextResponse> {
  try {
    const { fileId } = params;

    // Validate ObjectId
    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file ID' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'audio' });
    
    // Get file info efficiently
    const filesCursor = bucket.find({ _id: new ObjectId(fileId) });
    const files = await filesCursor.toArray();
    
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Audio file not found' },
        { status: 404 }
      );
    }

    const fileInfo = files[0];
    const fileSize = fileInfo.length;
    const range = request.headers.get('range');

    // Set optimized headers
    const headers = new Headers();
    headers.set('Content-Type', fileInfo.metadata?.mimeType || 'audio/mpeg');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800'); // 1 day cache, 1 week stale
    headers.set('ETag', `"${fileId}-${fileInfo.uploadDate.getTime()}"`);
    headers.set('Last-Modified', fileInfo.uploadDate.toUTCString());
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range');

    // Handle conditional requests
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === `"${fileId}-${fileInfo.uploadDate.getTime()}"`) {
      return new NextResponse(null, { status: 304 });
    }

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      let end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 512 * 1024, fileSize - 1); // 512KB chunks
      
      // Ensure end doesn't exceed file size
      end = Math.min(end, fileSize - 1);
      const chunkSize = end - start + 1;

      // Check cache for this chunk
      const cacheKey = `${fileId}:${start}:${end}`;
      const cached = audioCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        headers.set('Content-Length', chunkSize.toString());
        headers.set('X-Cache', 'HIT');
        
        return new NextResponse(new Uint8Array(cached.data), {
          status: 206,
          headers,
        });
      }

      // Stream from GridFS
      const downloadStream = bucket.openDownloadStream(new ObjectId(fileId), {
        start,
        end: end + 1 // GridFS end is exclusive
      });

      // Convert stream to buffer for caching and response
      const chunks: Buffer[] = [];
      
      return new Promise((resolve) => {
        downloadStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          
          // Cache the chunk if it's not too large
          if (buffer.length <= 1024 * 1024) { // Cache chunks up to 1MB
            audioCache.set(cacheKey, { data: buffer, timestamp: Date.now() });
            
            // Clean old cache entries
            if (audioCache.size > 100) {
              const now = Date.now();
              const entries = Array.from(audioCache.entries());
              for (const [key, value] of entries) {
                if (now - value.timestamp > CACHE_TTL) {
                  audioCache.delete(key);
                }
              }
            }
          }

          headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
          headers.set('Content-Length', buffer.length.toString());
          headers.set('X-Cache', 'MISS');
          
          resolve(new NextResponse(new Uint8Array(buffer), {
            status: 206,
            headers,
          }));
        });

        downloadStream.on('error', (error) => {
          console.error('Stream error:', error);
          resolve(NextResponse.json(
            { success: false, message: 'Stream error' },
            { status: 500 }
          ));
        });
      });

    } else {
      // Full file request - send first chunk for immediate playback with correct headers
      const initialChunkSize = Math.min(256 * 1024, fileSize); // 256KB for quick start
      const downloadStream = bucket.openDownloadStream(new ObjectId(fileId), {
        start: 0,
        end: initialChunkSize
      });

      // Use partial content to avoid content-length mismatch
      headers.set('Content-Length', initialChunkSize.toString());
      headers.set('Content-Range', `bytes 0-${initialChunkSize - 1}/${fileSize}`);

      return new NextResponse(downloadStream as any, {
        status: 206, // Always use partial content for audio
        headers,
      });
    }

  } catch (error) {
    console.error('Audio streaming error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to stream audio file' },
      { status: 500 }
    );
  }
}
