import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}

export function generateToken(payload: JWTPayload, expiresIn: string | number = '7d'): string {
  const options: SignOptions = { expiresIn: expiresIn as any };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function generateVerificationToken(email: string): string {
  return jwt.sign({ email, type: 'verification' }, JWT_SECRET, { expiresIn: '24h' as any });
}

export function generatePasswordResetToken(email: string): string {
  return jwt.sign({ email, type: 'password-reset' }, JWT_SECRET, { expiresIn: '1h' as any });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function verifyVerificationToken(token: string): { email: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'verification') {
      throw new Error('Invalid token type');
    }
    return { email: decoded.email };
  } catch (error) {
    throw new Error('Invalid or expired verification token');
  }
}

export function verifyPasswordResetToken(token: string): { email: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'password-reset') {
      throw new Error('Invalid token type');
    }
    return { email: decoded.email };
  } catch (error) {
    throw new Error('Invalid or expired password reset token');
  }
}
