import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Auth failed
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    const users = await usersCollection
      .find({}, { projection: { passwordHash: 0 } }) // Exclude password hash
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      users
    });

  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
