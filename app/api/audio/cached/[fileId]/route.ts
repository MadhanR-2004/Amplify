import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';

// File system cache directory
const CACHE_DIR = path.join(process.cwd(), '.audio-cache');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params;

    // Validate ObjectId
    if (!ObjectId.isValid(fileId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file ID' },
        { status: 400 }
      );
    }

    const range = request.headers.get('range');
    const cacheFilePath = path.join(CACHE_DIR, `${fileId}.mp3`);
    const cacheInfoPath = path.join(CACHE_DIR, `${fileId}.json`);

    // Check if file exists in cache and is still valid
    if (fs.existsSync(cacheFilePath) && fs.existsSync(cacheInfoPath)) {
      try {
        const cacheInfo = JSON.parse(fs.readFileSync(cacheInfoPath, 'utf-8'));
        const cacheAge = Date.now() - cacheInfo.timestamp;
        
        if (cacheAge < CACHE_TTL) {
          // Serve from file system cache (super fast!)
          return serveFromFileSystem(cacheFilePath, cacheInfo, range);
        } else {
          // Cache expired, delete old files
          fs.unlinkSync(cacheFilePath);
          fs.unlinkSync(cacheInfoPath);
        }
      } catch (error) {
        // Invalid cache, remove it
        try {
          fs.unlinkSync(cacheFilePath);
          fs.unlinkSync(cacheInfoPath);
        } catch {}
      }
    }

    // File not in cache or expired, get from MongoDB
    const db = await getDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'audio' });
    
    const filesCursor = bucket.find({ _id: new ObjectId(fileId) });
    const files = await filesCursor.toArray();
    
    if (files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Audio file not found' },
        { status: 404 }
      );
    }

    const fileInfo = files[0];
    
    // Cache file to disk in background for future requests
    cacheFileToDisk(bucket, fileId, fileInfo, cacheFilePath, cacheInfoPath);
    
    // For this request, stream directly from MongoDB
    return streamFromMongoDB(bucket, fileId, fileInfo, range);

  } catch (error) {
    console.error('Audio streaming error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to stream audio file' },
      { status: 500 }
    );
  }
}

async function serveFromFileSystem(
  filePath: string, 
  fileInfo: any, 
  range: string | null
) {
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;

  const headers = new Headers();
  headers.set('Content-Type', fileInfo.mimeType || 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Cache', 'HIT');
  headers.set('Access-Control-Allow-Origin', '*');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10) || 0;
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });
    
    headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    headers.set('Content-Length', chunkSize.toString());

    return new NextResponse(stream as any, {
      status: 206,
      headers,
    });
  } else {
    const stream = fs.createReadStream(filePath);
    headers.set('Content-Length', fileSize.toString());

    return new NextResponse(stream as any, {
      status: 200,
      headers,
    });
  }
}

async function streamFromMongoDB(
  bucket: GridFSBucket,
  fileId: string,
  fileInfo: any,
  range: string | null
) {
  const fileSize = fileInfo.length;
  
  const headers = new Headers();
  headers.set('Content-Type', fileInfo.metadata?.mimeType || 'audio/mpeg');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=86400');
  headers.set('X-Cache', 'MISS');
  headers.set('Access-Control-Allow-Origin', '*');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10) || 0;
    const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 512 * 1024, fileSize - 1);
    const chunkSize = end - start + 1;

    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId), {
      start,
      end: end + 1
    });

    headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    headers.set('Content-Length', chunkSize.toString());

    return new NextResponse(downloadStream as any, {
      status: 206,
      headers,
    });
  } else {
    // For initial load, send first chunk
    const initialChunkSize = Math.min(256 * 1024, fileSize);
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId), {
      start: 0,
      end: initialChunkSize
    });

    headers.set('Content-Length', fileSize.toString());
    headers.set('Content-Range', `bytes 0-${initialChunkSize - 1}/${fileSize}`);

    return new NextResponse(downloadStream as any, {
      status: 206,
      headers,
    });
  }
}

async function cacheFileToDisk(
  bucket: GridFSBucket,
  fileId: string,
  fileInfo: any,
  cacheFilePath: string,
  cacheInfoPath: string
) {
  try {
    // Don't block the response, cache in background
    setImmediate(async () => {
      const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
      const writeStream = fs.createWriteStream(cacheFilePath);
      
      downloadStream.pipe(writeStream);
      
      writeStream.on('finish', () => {
        // Save cache info
        const cacheInfo = {
          timestamp: Date.now(),
          mimeType: fileInfo.metadata?.mimeType || 'audio/mpeg',
          size: fileInfo.length,
          fileId
        };
        
        fs.writeFileSync(cacheInfoPath, JSON.stringify(cacheInfo));
        console.log(`Cached audio file ${fileId} to disk`);
      });

      writeStream.on('error', (error) => {
        console.error('Error caching file to disk:', error);
        // Clean up partial file
        try {
          fs.unlinkSync(cacheFilePath);
        } catch {}
      });
    });
  } catch (error) {
    console.error('Background caching error:', error);
  }
}
