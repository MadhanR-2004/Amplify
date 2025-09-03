import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';
import { generateVerificationToken } from '@/lib/jwt';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json();

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User already exists with this email or username' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = {
      username,
      email: email.toLowerCase(),
      passwordHash,
      role: 'user' as const,
      isVerified: false,
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    // Generate verification token and send email
    const verificationToken = generateVerificationToken(email);
    await sendVerificationEmail(email, verificationToken);

    return NextResponse.json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      user: {
        id: result.insertedId,
        username,
        email: email.toLowerCase(),
        role: 'user',
        isVerified: false,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
