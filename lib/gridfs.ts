import { GridFSBucket, ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';

export async function getGridFSBucket(bucketName = 'fs') {
  const db = await getDatabase();
  return new GridFSBucket(db, { bucketName });
}

export async function uploadToGridFS(
  file: Buffer | Uint8Array,
  filename: string,
  metadata?: any,
  bucketName = 'fs'
) {
  try {
    const bucket = await getGridFSBucket(bucketName);
    
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        uploadedAt: new Date(),
      },
    });

    return new Promise((resolve, reject) => {
      uploadStream.on('finish', () => {
        resolve({
          id: uploadStream.id,
          filename: uploadStream.filename,
          length: uploadStream.length,
        });
      });

      uploadStream.on('error', (error) => {
        reject(error);
      });

      uploadStream.end(file);
    });
  } catch (error) {
    throw new Error(`GridFS upload failed: ${error}`);
  }
}

export async function getFromGridFS(fileId: string | ObjectId, bucketName = 'fs', start?: number, end?: number) {
  try {
    const bucket = await getGridFSBucket(bucketName);
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
    
    if (start !== undefined && end !== undefined) {
      // GridFS expects end to be exclusive, but HTTP range is inclusive
      // So we need to add 1 to the end value for GridFS
      return bucket.openDownloadStream(objectId, { start, end: end + 1 });
    }
    
    return bucket.openDownloadStream(objectId);
  } catch (error) {
    throw new Error(`GridFS download failed: ${error}`);
  }
}

export async function deleteFromGridFS(fileId: string | ObjectId, bucketName = 'fs') {
  try {
    const bucket = await getGridFSBucket(bucketName);
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
    
    await bucket.delete(objectId);
    return true;
  } catch (error) {
    throw new Error(`GridFS delete failed: ${error}`);
  }
}

// Cache for file info to avoid repeated database queries
const fileInfoCache = new Map<string, any>();

export async function getFileInfo(fileId: string | ObjectId, bucketName = 'fs') {
  try {
    const cacheKey = `${bucketName}:${fileId.toString()}`;
    
    // Check cache first
    if (fileInfoCache.has(cacheKey)) {
      return fileInfoCache.get(cacheKey);
    }
    
    const db = await getDatabase();
    const bucket = new GridFSBucket(db, { bucketName });
    const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;
    
    const files = await bucket.find({ _id: objectId }).toArray();
    const fileInfo = files.length > 0 ? files[0] : null;
    
    // Cache the result for 5 minutes
    if (fileInfo) {
      fileInfoCache.set(cacheKey, fileInfo);
      setTimeout(() => fileInfoCache.delete(cacheKey), 5 * 60 * 1000);
    }
    
    return fileInfo;
  } catch (error) {
    throw new Error(`GridFS file info failed: ${error}`);
  }
}
