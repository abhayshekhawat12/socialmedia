import { supabaseServer, withTimestamps, withUpdatedTimestamp } from "@/lib/supabaseServer";
import crypto from "crypto";

export function normalizeEmail(email?: string | null): string | null {
  if (!email || typeof email !== "string") return null;
  const clean = email.trim().toLowerCase();
  return clean.length > 0 ? clean : null;
}

export function normalizeWallet(wallet?: string | null): string | null {
  if (!wallet || typeof wallet !== "string") return null;
  const clean = wallet.trim().toLowerCase();
  return clean.startsWith("0x") ? clean : clean;
}

export interface ResolveUserParams {
  email?: string | null;
  googleId?: string | null;
  userId?: string | null;
  walletAddress?: string | null;
  displayName?: string | null;
  picture?: string | null;
  bio?: string | null;
}

export interface ResolvedUserResult {
  user: any;
  profile: any;
  isNew: boolean;
}

/**
 * Centralized identity resolver.
 * ENFORCES: ONE EMAIL = ONE APP USER.
 * Never creates a new user if an email or provider match already exists.
 */
export async function resolveOrCreateUser(params: ResolveUserParams): Promise<ResolvedUserResult> {
  const cleanEmail = normalizeEmail(params.email);
  const cleanWallet = normalizeWallet(params.walletAddress);
  const cleanGoogleId = params.googleId ? String(params.googleId).trim() : null;
  const cleanUserId = params.userId ? String(params.userId).trim() : null;

  let user: any = null;
  let profile: any = null;

  // 1. PRIMARY IDENTITY CHECK: Search by normalized email
  if (cleanEmail) {
    const { data: userByEmail } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (userByEmail) {
      user = userByEmail;
    }
  }

  // 2. SECONDARY IDENTITY CHECK: Search by Google ID
  if (!user && cleanGoogleId) {
    const { data: userByGoogle } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .eq("googleId", cleanGoogleId)
      .maybeSingle();

    if (userByGoogle) {
      user = userByGoogle;
    }
  }

  // 3. TERTIARY IDENTITY CHECK: Search by explicit User ID
  if (!user && cleanUserId) {
    const { data: userById } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .eq("id", cleanUserId)
      .maybeSingle();

    if (userById) {
      user = userById;
    }
  }

  // 4. QUATERNARY IDENTITY CHECK: Search by Wallet Address (if valid EVM address)
  if (!user && cleanWallet && cleanWallet.startsWith("0x")) {
    const { data: userByWallet } = await supabaseServer
      .from("User")
      .select("*, profile:Profile(*)")
      .eq("walletAddress", cleanWallet)
      .maybeSingle();

    if (userByWallet) {
      user = userByWallet;
    }
  }

  // A. IF EXISTING USER FOUND -> Link any missing provider info, NEVER create new user
  if (user) {
    const updatePayload: any = {};
    if (cleanEmail && !user.email) updatePayload.email = cleanEmail;
    if (cleanGoogleId && !user.googleId) updatePayload.googleId = cleanGoogleId;
    if (cleanWallet && cleanWallet.startsWith("0x") && !user.walletAddress) {
      updatePayload.walletAddress = cleanWallet;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { data: updated } = await supabaseServer
        .from("User")
        .update(withUpdatedTimestamp(updatePayload))
        .eq("id", user.id)
        .select("*, profile:Profile(*)")
        .single();

      if (updated) {
        user = updated;
      }
    }

    // Ensure Profile exists for existing user
    const existingProfile = Array.isArray(user.profile) ? user.profile[0] : user.profile;
    if (existingProfile) {
      profile = existingProfile;
    } else {
      const fallbackName = params.displayName || user.email?.split("@")[0] || "Pulse Creator";
      const baseUsername = `u_${fallbackName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10)}`;
      const finalUsername = `${baseUsername || "user"}_${Math.floor(100 + Math.random() * 900)}`;

      const { data: newProfile } = await supabaseServer
        .from("Profile")
        .insert(
          withTimestamps({
            userId: user.id,
            username: finalUsername,
            displayName: fallbackName,
            avatarUrl: params.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
            bio: params.bio || "Pulse Creator",
          })
        )
        .select()
        .single();

      profile = newProfile;
    }

    return { user, profile, isNew: false };
  }

  // B. BRAND NEW USER CREATION (ONLY when absolutely no existing user was found)
  const newUserId = cleanUserId || crypto.randomUUID();
  const effectiveName = params.displayName || (cleanEmail ? cleanEmail.split("@")[0] : `Creator_${newUserId.slice(0, 6)}`);
  const initialWallet = cleanWallet && cleanWallet.startsWith("0x")
    ? cleanWallet
    : `usr_${crypto.createHash("sha256").update(cleanEmail || newUserId).digest("hex").slice(0, 16)}`;

  const { data: newUser, error: createErr } = await supabaseServer
    .from("User")
    .insert(
      withTimestamps({
        id: newUserId,
        email: cleanEmail || null,
        googleId: cleanGoogleId || null,
        walletAddress: initialWallet,
      })
    )
    .select()
    .single();

  if (createErr || !newUser) {
    // In case of parallel race condition, retry fetch by email or id
    if (cleanEmail) {
      const { data: raceUser } = await supabaseServer
        .from("User")
        .select("*, profile:Profile(*)")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (raceUser) {
        const p = Array.isArray(raceUser.profile) ? raceUser.profile[0] : raceUser.profile;
        return { user: raceUser, profile: p, isNew: false };
      }
    }
    throw new Error(createErr?.message || "Failed to create user in database");
  }

  user = newUser;

  // Create Profile for new user
  const baseUsername = cleanGoogleId ? `g_${effectiveName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10)}` : `u_${effectiveName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 10)}`;
  const finalUsername = `${baseUsername || "user"}_${Math.floor(100 + Math.random() * 900)}`;

  const { data: newProfile } = await supabaseServer
    .from("Profile")
    .insert(
      withTimestamps({
        userId: newUser.id,
        username: finalUsername,
        displayName: effectiveName,
        avatarUrl: params.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${newUser.id}`,
        bio: params.bio || "Pulse Creator",
      })
    )
    .select()
    .single();

  profile = newProfile;

  return { user, profile, isNew: true };
}
