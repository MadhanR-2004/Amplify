import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { requireAdmin } from '@/lib/middleware';
import { parseBuffer } from 'music-metadata';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const formData = await request.formData();
    const file = formData.get('audioFile') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only MP3, WAV, and OGG files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract audio metadata including duration
    let duration = 0;
    try {
      const metadata = await parseBuffer(buffer, { mimeType: file.type });
      duration = Math.round(metadata.format.duration || 0);
    } catch (metadataError) {
      console.warn('Could not extract audio metadata:', metadataError);
      // Continue without duration - will be set to 0
    }

    // Create unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'audio');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Save file
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Return the public URL
    const fileUrl = `/uploads/audio/${fileName}`;

    return NextResponse.json({
      success: true,
      message: 'Audio file uploaded successfully',
      fileUrl,
      fileName,
      fileSize: file.size,
      mimeType: file.type,
      duration: duration
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, message: 'File upload failed' },
      { status: 500 }
    );
  }
}
