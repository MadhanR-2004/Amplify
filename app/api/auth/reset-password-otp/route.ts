import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, otp, password } = await request.json();

    if (!email || !otp || !password) {
      return NextResponse.json(
        { success: false, message: 'Email, OTP, and password are required' },
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

    // Find user with matching email and OTP
    const user = await usersCollection.findOne({ 
      email: email.toLowerCase(),
      resetOTP: otp
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid email or OTP' },
        { status: 400 }
      );
    }

    // Check if OTP has expired
    if (user.resetOTPExpiry && new Date() > new Date(user.resetOTPExpiry)) {
      // Clean up expired OTP
      await usersCollection.updateOne(
        { email: email.toLowerCase() },
        { 
          $unset: { 
            resetOTP: "",
            resetOTPExpiry: ""
          } 
        }
      );

      return NextResponse.json(
        { success: false, message: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password and remove OTP fields
    const result = await usersCollection.updateOne(
      { email: email.toLowerCase() },
      { 
        $set: { 
          passwordHash,
          updatedAt: new Date()
        },
        $unset: {
          resetOTP: "",
          resetOTPExpiry: ""
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to update password' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.',
    });

  } catch (error) {
    console.error('Reset password with OTP error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
