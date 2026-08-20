import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withCreatedAt } from "@/lib/supabaseServer";
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
    const conversationId = searchParams.get("conversationId");
    const paramAddress = searchParams.get("userAddress") || searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const beforeTimestamp = searchParams.get("before");
    const currentUserId = await getRequesterUserId(req, paramAddress);

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required." }, { status: 400 });
    }

    let query = supabaseServer
      .from("Message")
      .select("*")
      .eq("conversationId", conversationId);

    if (beforeTimestamp) {
      query = query.lt("createdAt", beforeTimestamp);
    }

    const { data: messages, error } = await query
      .order("createdAt", { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ success: true, messages: [] });
    }

    // Get user aliases to accurately identify 'me' vs 'other'
    let myAliases: string[] = [];
    if (currentUserId) {
      const { data: userRecord } = await supabaseServer
        .from("User")
        .select("id, walletAddress, email")
        .eq("id", currentUserId)
        .maybeSingle();

      myAliases = Array.from(
        new Set([
          currentUserId,
          userRecord?.walletAddress?.toLowerCase(),
          userRecord?.email?.toLowerCase(),
        ].filter(Boolean) as string[])
      );

      // Asynchronously mark unread messages as read
      supabaseServer
        .from("Message")
        .update({ read: true })
        .eq("conversationId", conversationId)
        .not("senderAddress", "in", `(${myAliases.join(",")})`)
        .eq("read", false)
        .then(() => {});
    }

    const formattedMessages = (messages || []).map((m) => {
      const isMe = myAliases.some((alias) => alias.toLowerCase() === m.senderAddress?.toLowerCase());
      return {
        id: m.id,
        sender: isMe ? "me" : "other",
        senderAddress: m.senderAddress,
        text: m.content,
        time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: m.createdAt,
        read: m.read,
      };
    });

    return NextResponse.json({ success: true, messages: formattedMessages });
  } catch (error: any) {
    console.error("GET messages error:", error);
    return NextResponse.json({ success: true, messages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, content, userAddress: bodyAddress } = body;
    const currentUserId = await getRequesterUserId(req, bodyAddress);

    if (!currentUserId) {
      return NextResponse.json({ error: "User authentication required." }, { status: 401 });
    }

    if (!conversationId || !content || !content.trim()) {
      return NextResponse.json({ error: "Conversation ID and message content are required." }, { status: 400 });
    }

    const messageId = crypto.randomUUID();

    // Create message with canonical sender User ID
    const { data: newMsg, error: msgErr } = await supabaseServer
      .from("Message")
      .insert(
        withCreatedAt({
          id: messageId,
          conversationId,
          senderAddress: currentUserId,
          content: content.trim(),
          read: false,
        })
      )
      .select()
      .single();

    if (msgErr || !newMsg) {
      console.error("Message insert error:", msgErr);
      throw new Error(msgErr?.message || "Failed to create message");
    }

    // Update conversation timestamp asynchronously
    supabaseServer
      .from("Conversation")
      .update({ updatedAt: new Date().toISOString() })
      .eq("id", conversationId)
      .then(() => {});

    return NextResponse.json({
      success: true,
      message: {
        id: newMsg.id,
        sender: "me",
        senderAddress: currentUserId,
        text: newMsg.content,
        time: new Date(newMsg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timestamp: newMsg.createdAt,
        read: false,
      },
    });
  } catch (error: any) {
    console.error("POST messages error:", error);
    return NextResponse.json({ error: error.message || "Failed to send message" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");
    const paramAddress = searchParams.get("userAddress") || searchParams.get("userId");
    const currentUserId = await getRequesterUserId(req, paramAddress);

    if (!messageId) {
      return NextResponse.json({ error: "Message ID is required." }, { status: 400 });
    }

    // 1. Fetch message to check ownership
    const { data: msg } = await supabaseServer
      .from("Message")
      .select("*")
      .eq("id", messageId)
      .maybeSingle();

    if (!msg) {
      return NextResponse.json({ success: true, message: "Message already deleted" });
    }

    // If authenticated, check if user is the sender
    if (currentUserId) {
      const { data: userRecord } = await supabaseServer
        .from("User")
        .select("id, walletAddress, email")
        .eq("id", currentUserId)
        .maybeSingle();

      const myAliases = Array.from(
        new Set([
          currentUserId,
          userRecord?.walletAddress?.toLowerCase(),
          userRecord?.email?.toLowerCase(),
        ].filter(Boolean) as string[])
      );

      const isOwner = myAliases.some((alias) => alias.toLowerCase() === msg.senderAddress?.toLowerCase());
      if (!isOwner) {
        return NextResponse.json({ error: "You can only delete your own sent messages." }, { status: 403 });
      }
    }

    // Delete message from database
    const { error: deleteErr } = await supabaseServer
      .from("Message")
      .delete()
      .eq("id", messageId);

    if (deleteErr) {
      throw new Error(deleteErr.message);
    }

    return NextResponse.json({ success: true, messageId, message: "Message deleted successfully." });
  } catch (error: any) {
    console.error("DELETE message error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete message" }, { status: 500 });
  }
}
