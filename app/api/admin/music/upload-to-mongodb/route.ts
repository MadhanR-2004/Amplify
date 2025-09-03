import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/middleware';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { parseBuffer } from 'music-metadata';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, message: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { success: false, message: 'File must be an audio file' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File size must be less than 50MB' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const bucket = new GridFSBucket(db, { bucketName: 'audio' });

    // Create a readable stream from the file
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Extract audio metadata including duration
    let duration = 0;
    try {
      console.log('Attempting to extract metadata from audio file:', audioFile.name);
      const metadata = await parseBuffer(buffer, { mimeType: audioFile.type });
      duration = Math.round(metadata.format.duration || 0);
      console.log('Successfully extracted duration:', duration, 'seconds');
    } catch (metadataError) {
      console.warn('Could not extract audio metadata:', metadataError);
      // Continue without duration - will be set to 0
    }
    
    const readable = Readable.from(buffer);

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${audioFile.name}`;

    // Upload to GridFS
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        originalName: audioFile.name,
        mimeType: audioFile.type,
        size: audioFile.size,
        uploadedBy: new ObjectId(authResult.user.userId),
        uploadedAt: new Date(),
        duration: duration,
      },
    });

    // Create promise to handle upload completion
    const uploadPromise = new Promise((resolve, reject) => {
      uploadStream.on('finish', () => {
        resolve(uploadStream.id);
      });
      uploadStream.on('error', (error) => {
        reject(error);
      });
    });

    // Pipe the readable stream to GridFS
    readable.pipe(uploadStream);

    // Wait for upload to complete
    const fileId = await uploadPromise;

    // Return the GridFS file URL
    const fileUrl = `/api/audio/${fileId}`;

    return NextResponse.json({
      success: true,
      message: 'Audio file uploaded to MongoDB successfully',
      fileUrl,
      fileId,
      filename,
      duration: duration,
    });

  } catch (error) {
    console.error('GridFS upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to upload audio file to MongoDB' },
      { status: 500 }
    );
  }
}
