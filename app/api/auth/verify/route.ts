import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { verifyVerificationToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Verify token
    const { email } = verifyVerificationToken(token);

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    // Find and update user
    const result = await usersCollection.updateOne(
      { email: email.toLowerCase() },
      { $set: { isVerified: true } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid or expired verification token' },
      { status: 400 }
    );
  }
}
