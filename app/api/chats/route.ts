import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";
import { verifyAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function resolveCanonicalUserId(identifier?: string | null): Promise<string | null> {
  if (!identifier) return null;
  const clean = identifier.toLowerCase().trim();

  const { data: user } = await supabaseServer
    .from("User")
    .select("id, profile:Profile(username)")
    .or(`id.eq.${clean},walletAddress.eq.${clean},email.eq.${clean}`)
    .maybeSingle();

  if (user?.id) return user.id;

  const { data: prof } = await supabaseServer
    .from("Profile")
    .select("userId")
    .eq("username", clean)
    .maybeSingle();

  if (prof?.userId) return prof.userId;

  return clean;
}

async function getRequesterUserId(req: NextRequest, queryOrBodyAddress?: string | null): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("block_social_jwt")?.value;
  const token = authHeader?.replace("Bearer ", "") || cookieToken;

  if (token) {
    const session = verifyAuthToken(token);
    if (session?.userId) {
      return await resolveCanonicalUserId(session.userId);
    }
  }

  if (queryOrBodyAddress) {
    return await resolveCanonicalUserId(queryOrBodyAddress);
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paramAddress = searchParams.get("userAddress") || searchParams.get("userId");
    const currentUserId = await getRequesterUserId(req, paramAddress);

    if (!currentUserId) {
      return NextResponse.json({ error: "User authentication required." }, { status: 401 });
    }

    // Get all aliases for current user to find all historical conversation memberships
    const { data: currentUserRecord } = await supabaseServer
      .from("User")
      .select("id, walletAddress, email, profile:Profile(username)")
      .eq("id", currentUserId)
      .maybeSingle();

    const currentUserProfile = currentUserRecord?.profile
      ? (Array.isArray(currentUserRecord.profile) ? currentUserRecord.profile[0] : currentUserRecord.profile)
      : null;

    const myAliases = Array.from(
      new Set([
        currentUserId,
        currentUserRecord?.walletAddress?.toLowerCase(),
        currentUserRecord?.email?.toLowerCase(),
        currentUserProfile?.username?.toLowerCase(),
      ].filter(Boolean) as string[])
    );

    // 1. Fetch all conversation memberships for current user
    const { data: userMemberships, error } = await supabaseServer
      .from("ConversationMember")
      .select("conversationId")
      .in("userAddress", myAliases);

    if (error || !userMemberships || userMemberships.length === 0) {
      return NextResponse.json({ success: true, chats: [] });
    }

    const conversationIds = Array.from(new Set(userMemberships.map((m) => m.conversationId)));

    // 2. Fetch all members for these conversations
    const { data: allMembers } = await supabaseServer
      .from("ConversationMember")
      .select("*")
      .in("conversationId", conversationIds);

    // 3. Fetch latest messages for each conversation
    const { data: messages } = await supabaseServer
      .from("Message")
      .select("*")
      .in("conversationId", conversationIds)
      .order("createdAt", { ascending: false });

    // 4. Fetch profiles for other members
    const otherMemberIdentifiers = Array.from(
      new Set(
        (allMembers || [])
          .filter((m) => !myAliases.includes(m.userAddress.toLowerCase()))
          .map((m) => m.userAddress.toLowerCase())
      )
    ).filter(Boolean);

    let profiles: any[] = [];
    if (otherMemberIdentifiers.length > 0) {
      const { data: profileData } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profileData || [];
    }

    const profileMap = new Map<string, any>();
    for (const p of profiles) {
      if (p.user?.id) profileMap.set(p.user.id.toLowerCase(), p);
      if (p.user?.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
      if (p.user?.email) profileMap.set(p.user.email.toLowerCase(), p);
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    }

    const chats = conversationIds.map((cid) => {
      const members = (allMembers || []).filter((m) => m.conversationId === cid);
      const otherMember = members.find((m) => !myAliases.includes(m.userAddress.toLowerCase()));
      if (!otherMember) return null;

      const otherAddrKey = otherMember.userAddress.toLowerCase();
      const prof = profileMap.get(otherAddrKey);
      const lastMsg = (messages || []).find((m) => m.conversationId === cid);

      const resolvedDisplayName =
        prof?.displayName ||
        (prof?.username ? `@${prof.username}` : null) ||
        (otherAddrKey.startsWith("0x") ? `User ${otherAddrKey.slice(0, 6)}` : `Member ${otherAddrKey.slice(0, 6)}`);

      const resolvedUsername = prof?.username ? `@${prof.username}` : `@member_${otherAddrKey.slice(0, 8)}`;
      const resolvedAvatar =
        prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(otherAddrKey)}`;

      const isUnread = lastMsg ? (!myAliases.includes(lastMsg.senderAddress.toLowerCase()) && !lastMsg.read ? 1 : 0) : 0;

      return {
        id: cid,
        name: resolvedDisplayName,
        username: resolvedUsername,
        avatar: resolvedAvatar,
        lastMessage: lastMsg ? lastMsg.content : "Start a conversation 👋",
        time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        timestamp: lastMsg ? lastMsg.createdAt : new Date().toISOString(),
        unread: isUnread,
        isOnline: true,
        isGroup: false,
        otherAddress: prof?.userId || otherMember.userAddress,
      };
    });

    const activeChats = chats
      .filter((c) => c !== null)
      .sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

    return NextResponse.json({ success: true, chats: activeChats });
  } catch (error: any) {
    console.error("GET chats error:", error);
    return NextResponse.json({ success: true, chats: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetAddress, targetUserId, userAddress: bodyAddress } = body;

    const currentUserId = await getRequesterUserId(req, bodyAddress);
    const resolvedTargetId = await resolveCanonicalUserId(targetUserId || targetAddress);

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized. User authentication required." }, { status: 401 });
    }

    if (!resolvedTargetId) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }

    if (currentUserId.toLowerCase() === resolvedTargetId.toLowerCase()) {
      return NextResponse.json({ error: "You cannot start a chat with yourself." }, { status: 400 });
    }

    // Resolve aliases for both users to prevent duplicate conversations
    const { data: currentRecord } = await supabaseServer
      .from("User")
      .select("id, walletAddress, email, profile:Profile(username)")
      .eq("id", currentUserId)
      .maybeSingle();

    const { data: targetRecord } = await supabaseServer
      .from("User")
      .select("id, walletAddress, email, profile:Profile(username)")
      .eq("id", resolvedTargetId)
      .maybeSingle();

    const currentAliases = Array.from(
      new Set([
        currentUserId,
        currentRecord?.walletAddress?.toLowerCase(),
        currentRecord?.email?.toLowerCase(),
      ].filter(Boolean) as string[])
    );

    const targetAliases = Array.from(
      new Set([
        resolvedTargetId,
        targetRecord?.walletAddress?.toLowerCase(),
        targetRecord?.email?.toLowerCase(),
      ].filter(Boolean) as string[])
    );

    // Check if 1-to-1 conversation ALREADY exists between these two users
    const { data: myMemberships } = await supabaseServer
      .from("ConversationMember")
      .select("conversationId")
      .in("userAddress", currentAliases);

    if (myMemberships && myMemberships.length > 0) {
      const myConvoIds = myMemberships.map((m) => m.conversationId);
      const { data: commonMemberships } = await supabaseServer
        .from("ConversationMember")
        .select("conversationId")
        .in("conversationId", myConvoIds)
        .in("userAddress", targetAliases);

      if (commonMemberships && commonMemberships.length > 0) {
        // Reuse existing conversation
        return NextResponse.json({
          success: true,
          conversationId: commonMemberships[0].conversationId,
          isNew: false,
        });
      }
    }

    // Create brand-new 1-to-1 conversation
    const newConvoId = crypto.randomUUID();
    await supabaseServer
      .from("Conversation")
      .insert(withTimestamps({ id: newConvoId }));

    await supabaseServer
      .from("ConversationMember")
      .insert([
        { id: crypto.randomUUID(), conversationId: newConvoId, userAddress: currentUserId, createdAt: new Date().toISOString() },
        { id: crypto.randomUUID(), conversationId: newConvoId, userAddress: resolvedTargetId, createdAt: new Date().toISOString() },
      ]);

    return NextResponse.json({
      success: true,
      conversationId: newConvoId,
      isNew: true,
    });
  } catch (error: any) {
    console.error("POST chats error:", error);
    return NextResponse.json({ error: error.message || "Failed to create conversation" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const paramAddress = searchParams.get("userAddress") || searchParams.get("userId");
    const currentUserId = await getRequesterUserId(req, paramAddress);

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required." }, { status: 400 });
    }

    // Delete conversation (Cascade deletes members and messages)
    await supabaseServer
      .from("Conversation")
      .delete()
      .eq("id", conversationId);

    return NextResponse.json({ success: true, conversationId, message: "Conversation deleted successfully." });
  } catch (error: any) {
    console.error("DELETE chat error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete conversation" }, { status: 500 });
  }
}

