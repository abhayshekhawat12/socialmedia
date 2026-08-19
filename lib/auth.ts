import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "aura_social_secure_jwt_secret_2026";

export interface AuthSession {
  userId: string;
  walletAddress?: string;
  email?: string;
  mobileNumber?: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign JWT session token for authenticated user session.
 */
export function signAuthToken(userId: string, identifier?: string): string {
  return jwt.sign(
    { 
      userId, 
      walletAddress: identifier || userId,
      email: identifier?.includes("@") ? identifier : undefined
    }, 
    JWT_SECRET, 
    { expiresIn: "30d" }
  );
}

/**
 * Verify JWT session token from authorization header or cookie.
 */
export function verifyAuthToken(token: string): AuthSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthSession;
    return decoded;
  } catch (error) {
    return null;
  }
}
