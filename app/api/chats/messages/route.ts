import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, withTimestamps } from "@/lib/supabaseServer";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

function getRequesterAddress(req: NextRequest, queryOrBodyAddress?: string | null): string | null {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token) {
    const session = verifyAuthToken(token);
    if (session?.walletAddress) return session.walletAddress.toLowerCase();
  }
  if (queryOrBodyAddress) return queryOrBodyAddress.toLowerCase();
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const paramAddress = searchParams.get("userAddress");
    const userAddress = getRequesterAddress(req, paramAddress);

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required." }, { status: 400 });
    }

    const { data: messages, error } = await supabaseServer
      .from("Message")
      .select("*")
      .eq("conversationId", conversationId)
      .order("createdAt", { ascending: true })
      .limit(100);

    if (error) {
      return NextResponse.json({ success: true, messages: [] });
    }

    if (userAddress) {
      // Mark received messages as read
      await supabaseServer
        .from("Message")
        .update({ read: true })
        .eq("conversationId", conversationId)
        .neq("senderAddress", userAddress)
        .eq("read", false);
    }

    const formattedMessages = (messages || []).map((m) => ({
      id: m.id,
      sender: userAddress && m.senderAddress.toLowerCase() === userAddress ? "me" : "other",
      senderAddress: m.senderAddress,
      text: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: m.createdAt,
      read: m.read,
    }));

    return NextResponse.json({ success: true, messages: formattedMessages });
  } catch (error: any) {
    console.error("GET messages error:", error);
    return NextResponse.json({ success: true, messages: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, content, mediaUrl, mediaType, userAddress: bodyAddress } = body;
    const userAddress = getRequesterAddress(req, bodyAddress);

    if (!userAddress) {
      return NextResponse.json({ error: "User address required." }, { status: 401 });
    }

    if (!conversationId || (!content && !mediaUrl)) {
      return NextResponse.json({ error: "Conversation ID and message content or media required." }, { status: 400 });
    }

    // Create message
    const { data: newMsg, error: msgErr } = await supabaseServer
      .from("Message")
      .insert(
        withTimestamps({
          conversationId,
          senderAddress: userAddress,
          content: content || "",
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          read: false,
        })
      )
      .select()
      .single();

    if (msgErr || !newMsg) {
      throw new Error(msgErr?.message || "Failed to create message");
    }

    // Update conversation updatedAt
    await supabaseServer
      .from("Conversation")
      .update({ updatedAt: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({
      success: true,
      message: {
        id: newMsg.id,
        sender: "me",
        senderAddress: userAddress,
        text: newMsg.content,
        mediaUrl: newMsg.mediaUrl,
        mediaType: newMsg.mediaType,
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
