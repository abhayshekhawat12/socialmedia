import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";
import { verifyAuthToken } from "@/lib/auth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized. Auth token required." }, { status: 401 });
    }

    const session = verifyAuthToken(token);
    if (!session || !session.walletAddress) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const userAddress = session.walletAddress.toLowerCase();

    // 1. Fetch conversation memberships
    const { data: userMemberships, error } = await supabaseServer
      .from("ConversationMember")
      .select("conversationId")
      .eq("userAddress", userAddress);

    if (error || !userMemberships) {
      return NextResponse.json({ success: true, chats: [] });
    }

    const conversationIds = userMemberships.map((m) => m.conversationId);
    if (conversationIds.length === 0) {
      return NextResponse.json({ success: true, chats: [] });
    }

    // 2. Fetch all members of these conversations
    const { data: allMembers } = await supabaseServer
      .from("ConversationMember")
      .select("*")
      .in("conversationId", conversationIds);

    // 3. Fetch latest message for each conversation
    const { data: messages } = await supabaseServer
      .from("Message")
      .select("*")
      .in("conversationId", conversationIds)
      .order("createdAt", { ascending: false });

    // Fetch profiles for other members
    const otherAddresses = Array.from(
      new Set(
        (allMembers || [])
          .filter((m) => m.userAddress.toLowerCase() !== userAddress)
          .map((m) => m.userAddress.toLowerCase())
      )
    ).filter(Boolean);

    let profiles: any[] = [];
    if (otherAddresses.length > 0) {
      const { data: profileData } = await supabaseServer
        .from("Profile")
        .select("*, user:User(*)");
      profiles = profileData || [];
    }

    const profileMap = new Map<string, any>();
    for (const p of profiles) {
      if (p.user?.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    }

    const chats = conversationIds.map((cid) => {
      const members = (allMembers || []).filter((m) => m.conversationId === cid);
      const otherMember = members.find((m) => m.userAddress.toLowerCase() !== userAddress);
      if (!otherMember) return null;

      const otherAddr = otherMember.userAddress.toLowerCase();
      const prof = profileMap.get(otherAddr);
      const lastMsg = (messages || []).find((m) => m.conversationId === cid);

      return {
        id: cid,
        name: prof?.displayName || `User ${otherAddr.slice(0, 6)}`,
        username: prof?.username ? `@${prof.username}` : `@user_${otherAddr.slice(0, 8)}`,
        avatar: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherAddr}`,
        lastMessage: lastMsg ? lastMsg.content : "No messages yet",
        time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        timestamp: lastMsg ? lastMsg.createdAt : new Date().toISOString(),
        unread: lastMsg ? (lastMsg.senderAddress.toLowerCase() !== userAddress && !lastMsg.read ? 1 : 0) : 0,
        isOnline: true,
        isGroup: false,
        otherAddress: otherMember.userAddress,
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
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const session = verifyAuthToken(token);
    if (!session || !session.walletAddress) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const { targetAddress } = await req.json();
    if (!targetAddress) {
      return NextResponse.json({ error: "Target member address required." }, { status: 400 });
    }

    const userAddress = session.walletAddress.toLowerCase();
    const otherAddress = targetAddress.toLowerCase();

    if (userAddress === otherAddress) {
      return NextResponse.json({ error: "You cannot start a chat with yourself." }, { status: 400 });
    }

    // Check if shared conversation already exists
    const { data: myConvos } = await supabaseServer
      .from("ConversationMember")
      .select("conversationId")
      .eq("userAddress", userAddress);

    if (myConvos && myConvos.length > 0) {
      const myConvoIds = myConvos.map((m) => m.conversationId);
      const { data: commonConvos } = await supabaseServer
        .from("ConversationMember")
        .select("conversationId")
        .eq("userAddress", otherAddress)
        .in("conversationId", myConvoIds);

      if (commonConvos && commonConvos.length > 0) {
        return NextResponse.json({ success: true, conversationId: commonConvos[0].conversationId });
      }
    }

    // Create new conversation
    const newConvoId = crypto.randomUUID();
    await supabaseServer
      .from("Conversation")
      .insert(withTimestamps({ id: newConvoId }));

    await supabaseServer
      .from("ConversationMember")
      .insert([
        withTimestamps({ conversationId: newConvoId, userAddress }),
        withTimestamps({ conversationId: newConvoId, userAddress: otherAddress }),
      ]);

    return NextResponse.json({ success: true, conversationId: newConvoId, isNew: true });
  } catch (error: any) {
    console.error("POST chats error:", error);
    return NextResponse.json({ error: error.message || "Failed to create conversation" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const session = verifyAuthToken(token);
    if (!session || !session.walletAddress) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required." }, { status: 400 });
    }

    const userAddress = session.walletAddress.toLowerCase();

    // Verify membership
    const { data: membership } = await supabaseServer
      .from("ConversationMember")
      .select("id")
      .eq("conversationId", conversationId)
      .eq("userAddress", userAddress)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. You are not a member of this chat." }, { status: 403 });
    }

    await supabaseServer.from("Conversation").delete().eq("id", conversationId);
    return NextResponse.json({ success: true, message: "Conversation deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete conversation" }, { status: 500 });
  }
}
