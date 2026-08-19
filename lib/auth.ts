import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "aura_social_secure_jwt_secret_2026";

export interface AuthSession {
  userId: string;
  walletAddress?: string;
  email?: string;
  mobileNumber?: string;
  name?: string;
  picture?: string;
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
 * Supports both custom signed tokens and Supabase Auth JWT tokens.
 */
export function verifyAuthToken(token: string): AuthSession | null {
  if (!token || typeof token !== "string") return null;

  // 1. Try verifying with local JWT secret
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && (decoded.userId || decoded.sub)) {
      return {
        userId: decoded.userId || decoded.sub,
        walletAddress: decoded.walletAddress || decoded.userId || decoded.sub,
        email: decoded.email,
        mobileNumber: decoded.mobileNumber,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    }
  } catch (localErr) {
    // Fall through to Supabase JWT decoding
  }

  // 2. Decode Supabase Auth JWT if issued by Supabase
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && (decoded.sub || decoded.email)) {
      const userMeta = decoded.user_metadata || {};
      return {
        userId: decoded.sub,
        walletAddress: decoded.sub,
        email: decoded.email,
        name: userMeta.full_name || userMeta.name || decoded.email?.split("@")[0],
        picture: userMeta.avatar_url || userMeta.picture,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    }
  } catch (decodeErr) {
    console.warn("JWT decode fallback error:", decodeErr);
  }

  return null;
}
