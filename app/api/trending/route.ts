import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: pulses, error: pulseErr } = await supabaseServer
      .from('Pulse')
      .select('*')
      .order('pulseScore', { ascending: false })
      .limit(10);

    const pulseList = pulses || [];
    const authorAddresses = Array.from(new Set(pulseList.map((p) => (p.authorAddress || "").toLowerCase()))).filter(Boolean);

    let profiles: any[] = [];
    if (authorAddresses.length > 0) {
      const { data: profileData } = await supabaseServer
        .from('Profile')
        .select('*, user:User(*)');
      profiles = profileData || [];
    }

    const profileMap = new Map<string, any>();
    for (const p of profiles) {
      if (p.user) {
        if (p.user.walletAddress) profileMap.set(p.user.walletAddress.toLowerCase(), p);
        if (p.user.id) profileMap.set(p.user.id.toLowerCase(), p);
      }
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    }

    const trendingReels = pulseList.map((pulse) => {
      const authorKey = (pulse.authorAddress || "").toLowerCase();
      const prof = profileMap.get(authorKey);
      return {
        id: pulse.id,
        videoUrl: pulse.videoUrl,
        thumbnailUrl: pulse.thumbnailUrl,
        caption: pulse.caption,
        viewsCount: pulse.viewsCount || 0,
        likeCount: pulse.likeCount || 0,
        commentCount: pulse.commentCount || 0,
        creator: {
          username: prof?.username || `user_${authorKey.slice(0, 8)}`,
          displayName: prof?.displayName || `User ${authorKey.slice(0, 6)}`,
          avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
        },
      };
    });

    const { data: dbHashtags } = await supabaseServer
      .from('Hashtag')
      .select('*')
      .order('postCount', { ascending: false })
      .limit(10);

    const hashtags = (dbHashtags || []).map((h) => ({
      tag: h.tag.startsWith('#') ? h.tag : `#${h.tag}`,
      postCount: h.postCount,
      trend: '+12%',
      category: 'Trending',
    }));

    return NextResponse.json({
      success: true,
      hashtags,
      trendingReels,
    });
  } catch (error: any) {
    console.error('Error fetching trending data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending data' },
      { status: 500 }
    );
  }
}
