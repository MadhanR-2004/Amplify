import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function authenticateUser(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return { authenticated: false, user: null };
    }

    const decoded = verifyToken(token);
    return { authenticated: true, user: decoded };
  } catch (error) {
    return { authenticated: false, user: null };
  }
}

export async function requireAuth(request: NextRequest) {
  const auth = await authenticateUser(request);
  
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }
  
  return { user: auth.user };
}

export async function requireAdmin(request: NextRequest) {
  const auth = await authenticateUser(request);
  
  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, message: 'Authentication required' },
      { status: 401 }
    );
  }
  
  if (auth.user.role !== 'admin') {
    return NextResponse.json(
      { success: false, message: 'Admin access required' },
      { status: 403 }
    );
  }
  
  return { user: auth.user };
}
