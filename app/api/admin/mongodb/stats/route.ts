import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Get list of collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    // Get total document count across all collections
    let totalDocuments = 0;
    for (const collection of collectionNames) {
      const count = await db.collection(collection).countDocuments();
      totalDocuments += count;
    }
    
    // Get database stats
    const stats = await db.stats();
    const databaseSize = `${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB`;
    
    return NextResponse.json({
      success: true,
      stats: {
        collections: collectionNames,
        totalDocuments,
        databaseSize,
      }
    });
    
  } catch (error) {
    console.error('MongoDB stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch database stats' },
      { status: 500 }
    );
  }
}
