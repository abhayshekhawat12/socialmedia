import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

// GET: Retrieve active conversations list for logged-in user
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

    // 1. Fetch conversations the user is a member of
    const userMemberships = await prisma.conversationMember.findMany({
      where: { userAddress },
      include: {
        conversation: {
          include: {
            members: true,
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1
            }
          }
        }
      }
    });

    // 2. Format list and fetch profile details for the other members
    const chats = await Promise.all(
      userMemberships.map(async (membership) => {
        const conversation = membership.conversation;
        const otherMember = conversation.members.find(
          (m) => m.userAddress.toLowerCase() !== userAddress
        );

        if (!otherMember) return null;

        // Fetch other member's profile
        const otherProfile = await prisma.profile.findFirst({
          where: {
            user: {
              walletAddress: otherMember.userAddress.toLowerCase()
            }
          }
        });

        const lastMsg = conversation.messages[0] || null;

        return {
          id: conversation.id,
          name: otherProfile?.displayName || `User ${otherMember.userAddress.slice(0, 6)}`,
          username: otherProfile?.username ? `@${otherProfile.username}` : `@user_${otherMember.userAddress.slice(2, 8)}`,
          avatar: otherProfile?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
          lastMessage: lastMsg ? lastMsg.content : "No messages yet",
          time: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
          timestamp: lastMsg ? lastMsg.createdAt : conversation.updatedAt,
          unread: lastMsg ? (lastMsg.senderAddress.toLowerCase() !== userAddress && !lastMsg.read ? 1 : 0) : 0,
          isOnline: true, // Simplified online indicator
          isGroup: false,
          otherAddress: otherMember.userAddress
        };
      })
    );

    // Filter out nulls and sort by latest message timestamp
    const activeChats = chats
      .filter((c) => c !== null)
      .sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

    return NextResponse.json({ success: true, chats: activeChats });
  } catch (error: any) {
    console.error("GET chats error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch conversations" }, { status: 500 });
  }
}

// POST: Create or retrieve conversation with a target user
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

    // 1. Check if conversation already exists between these two users
    const existingConversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userAddress }
        }
      },
      include: {
        members: true
      }
    });

    const conversationMatch = existingConversations.find((convo) =>
      convo.members.some((m) => m.userAddress.toLowerCase() === otherAddress)
    );

    if (conversationMatch) {
      return NextResponse.json({ success: true, conversationId: conversationMatch.id });
    }

    // 2. Create new conversation if none exists
    const newConvo = await prisma.conversation.create({
      data: {
        members: {
          create: [
            { userAddress },
            { userAddress: otherAddress }
          ]
        }
      }
    });

    return NextResponse.json({ success: true, conversationId: newConvo.id, isNew: true });
  } catch (error: any) {
    console.error("POST chats error:", error);
    return NextResponse.json({ error: error.message || "Failed to create conversation" }, { status: 500 });
  }
}

// DELETE: Delete a conversation
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

    // Verify membership before deletion
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userAddress: {
          conversationId,
          userAddress
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "Unauthorized. You are not a member of this chat." }, { status: 403 });
    }

    // Delete entire conversation
    await prisma.conversation.delete({
      where: { id: conversationId }
    });

    return NextResponse.json({ success: true, message: "Conversation deleted successfully." });
  } catch (error: any) {
    console.error("DELETE chat error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete conversation" }, { status: 500 });
  }
}
