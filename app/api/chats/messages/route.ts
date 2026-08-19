import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

// GET: Fetch message history for a conversation
export async function GET(req: NextRequest) {
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
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userAddress: {
          conversationId,
          userAddress
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. Not a member of this chat." }, { status: 403 });
    }

    // 1. Fetch messages in this conversation
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });

    // 2. Filter out messages self-deleted by this user
    const activeMessages = messages.filter((msg) => {
      const deletedList = msg.deletedBy.split(",").map(a => a.trim().toLowerCase());
      return !deletedList.includes(userAddress);
    });

    // 3. Mark received messages in this conversation as read
    await prisma.message.updateMany({
      where: {
        conversationId,
        senderAddress: { not: userAddress },
        read: false
      },
      data: { read: true }
    });

    // Format to client Message structure
    const formatted = activeMessages.map((msg) => ({
      id: msg.id,
      sender: msg.senderAddress.toLowerCase() === userAddress ? "me" : "other",
      text: msg.content,
      type: "text",
      timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: msg.read ? "read" : "sent",
      senderAddress: msg.senderAddress
    }));

    return NextResponse.json({ success: true, messages: formatted });
  } catch (error: any) {
    console.error("GET messages error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch messages" }, { status: 500 });
  }
}

// POST: Send a message in a conversation
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

    const { conversationId, content } = await req.json();
    if (!conversationId || !content || !content.trim()) {
      return NextResponse.json({ error: "Conversation ID and message content required." }, { status: 400 });
    }

    const userAddress = session.walletAddress.toLowerCase();

    // Verify membership
    const members = await prisma.conversationMember.findMany({
      where: { conversationId }
    });

    const isMember = members.some((m) => m.userAddress.toLowerCase() === userAddress);
    if (!isMember) {
      return NextResponse.json({ error: "Unauthorized. Not a member of this chat." }, { status: 403 });
    }

    // 1. Create message
    const msg = await prisma.message.create({
      data: {
        conversationId,
        senderAddress: userAddress,
        content: content.trim()
      }
    });

    // Update conversation update timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    // 2. Trigger notification to the other member
    const otherMember = members.find((m) => m.userAddress.toLowerCase() !== userAddress);
    if (otherMember) {
      const senderProfile = await prisma.profile.findFirst({
        where: { user: { walletAddress: userAddress } }
      });
      const senderName = senderProfile?.displayName || "Someone";

      await prisma.notification.create({
        data: {
          recipientAddress: otherMember.userAddress.toLowerCase(),
          senderAddress: userAddress,
          type: "MESSAGE",
          title: "New Message",
          message: `${senderName}: ${content.length > 50 ? content.slice(0, 47) + "..." : content}`,
          link: `/chats?conversationId=${conversationId}`
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: {
        id: msg.id,
        sender: "me",
        text: msg.content,
        type: "text",
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "sent",
        senderAddress: userAddress
      }
    });
  } catch (error: any) {
    console.error("POST message error:", error);
    return NextResponse.json({ error: error.message || "Failed to send message" }, { status: 500 });
  }
}

// DELETE: Delete a message for self (adds userAddress to deletedBy list)
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
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json({ error: "Message ID required." }, { status: 400 });
    }

    const userAddress = session.walletAddress.toLowerCase();

    // Fetch message
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    // Verify user is in conversation
    const isMember = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userAddress: {
          conversationId: msg.conversationId,
          userAddress
        }
      }
    });

    if (!isMember) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    // Update deletedBy column to include userAddress
    const currentDeleted = msg.deletedBy ? msg.deletedBy.split(",") : [];
    if (!currentDeleted.includes(userAddress)) {
      currentDeleted.push(userAddress);
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedBy: currentDeleted.join(",") }
    });

    return NextResponse.json({ success: true, message: "Message hidden/deleted for self." });
  } catch (error: any) {
    console.error("DELETE message error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete message" }, { status: 500 });
  }
}
