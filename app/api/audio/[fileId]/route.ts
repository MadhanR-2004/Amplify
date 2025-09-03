import { NextRequest, NextResponse } from 'next/server';
import { getFromGridFS, getFileInfo } from '@/lib/gridfs';
import { ObjectId } from 'mongodb';

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

    // Get file info from GridFS (cached for performance)
    const fileInfo = await getFileInfo(fileId, 'audio');
    
    if (!fileInfo) {
      return NextResponse.json(
        { success: false, message: 'Audio file not found' },
        { status: 404 }
      );
    }

    const range = request.headers.get('range');
    const fileSize = fileInfo.length;
    
    // Set common headers
    const headers = new Headers();
    headers.set('Content-Type', fileInfo.metadata?.mimeType || 'audio/mpeg');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');
    headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range');

    console.log(`Audio request for ${fileId}, file size: ${fileSize}, range: ${range || 'none'}`);

    // Handle range requests for efficient streaming and seeking
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024, fileSize - 1); // Stream in 1MB chunks
      
      const chunksize = (end - start) + 1;
      
      console.log(`Range request: ${start}-${end}/${fileSize}, chunk size: ${chunksize}`);

      // Get partial stream from GridFS
      const downloadStream = await getFromGridFS(fileId, 'audio', start, end);

      // Convert stream to buffer to ensure correct content length
      const chunks: Buffer[] = [];
      
      return new Promise<NextResponse>((resolve) => {
        downloadStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          
          headers.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
          headers.set('Content-Length', buffer.length.toString());
          
          resolve(new NextResponse(new Uint8Array(buffer), {
            status: 206, // Partial Content
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
      // For non-range requests, we should still use partial content
      // to avoid content-length mismatch issues
      const initialChunkSize = Math.min(512 * 1024, fileSize); // 512KB initial chunk
      console.log(`Non-range request: serving initial chunk 0-${initialChunkSize - 1}/${fileSize}`);
      
      const downloadStream = await getFromGridFS(fileId, 'audio', 0, initialChunkSize - 1);
      
      // Convert stream to buffer to ensure correct content length
      const chunks: Buffer[] = [];
      
      return new Promise<NextResponse>((resolve) => {
        downloadStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        downloadStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          
          headers.set('Content-Range', `bytes 0-${buffer.length - 1}/${fileSize}`);
          headers.set('Content-Length', buffer.length.toString());
          
          resolve(new NextResponse(new Uint8Array(buffer), {
            status: 206, // Use partial content to avoid mismatch
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
    }

  } catch (error) {
    console.error('Audio streaming error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to stream audio file' },
      { status: 500 }
    );
  }
}
