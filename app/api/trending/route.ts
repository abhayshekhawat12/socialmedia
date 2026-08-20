import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'trending'; // trending | likes | views | recent
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    // 1. Fetch real posts from database
    const { data: posts, error: postErr } = await supabaseServer
      .from('Post')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(60);

    // 2. Fetch real reels (Pulse) from database
    const { data: pulses, error: pulseErr } = await supabaseServer
      .from('Pulse')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(40);

    const postList = posts || [];
    const pulseList = pulses || [];

    // Collect all author addresses to fetch profiles in a single query
    const authorAddresses = Array.from(
      new Set([
        ...postList.map((p) => (p.authorAddress || '').toLowerCase()),
        ...pulseList.map((p) => (p.authorAddress || '').toLowerCase()),
      ])
    ).filter(Boolean);

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
        if (p.user.email) profileMap.set(p.user.email.toLowerCase(), p);
      }
      if (p.userId) profileMap.set(p.userId.toLowerCase(), p);
      if (p.username) profileMap.set(p.username.toLowerCase(), p);
    }

    const now = Date.now();

    // 3. Compute Real Algorithmic Trending Score with exponential time-decay
    const enrichedPosts = postList
      .filter((p) => Boolean(p.mediaUrl || p.mediaCid || p.caption))
      .map((post) => {
        const authorKey = (post.authorAddress || '').toLowerCase();
        const prof = profileMap.get(authorKey);

        const views = post.viewsCount || 0;
        const likes = post.likeCount || 0;
        const comments = post.commentCount || 0;
        const shares = post.shareCount || 0;

        // Raw engagement weight
        const engagementScore = views * 1.0 + likes * 3.0 + comments * 5.0 + shares * 4.0;

        // Time decay formula: Score decays smoothly over days so fresh engaged content rises
        const ageInHours = Math.max(0.5, (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
        const timeDecayFactor = 1 / Math.pow(1 + ageInHours / 24, 1.25);
        const trendingScore = (engagementScore + 1) * timeDecayFactor;

        return {
          id: post.id,
          type: 'post',
          caption: post.caption,
          mediaUrl: post.mediaUrl,
          mediaType: post.mediaType || 'image',
          mediaCid: post.mediaCid,
          location: post.location,
          viewsCount: views,
          likeCount: likes,
          commentCount: comments,
          shareCount: shares,
          createdAt: post.createdAt,
          trendingScore,
          creator: {
            id: prof?.userId || post.authorAddress,
            address: post.authorAddress,
            username: prof?.username || `user_${authorKey.slice(0, 8)}`,
            displayName: prof?.displayName || `User ${authorKey.slice(0, 6)}`,
            avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
          },
        };
      });

    const enrichedReels = pulseList
      .filter((p) => Boolean(p.videoUrl || p.thumbnailUrl || p.caption))
      .map((pulse) => {
        const authorKey = (pulse.authorAddress || '').toLowerCase();
        const prof = profileMap.get(authorKey);

        const views = pulse.viewsCount || 0;
        const likes = pulse.likeCount || 0;
        const comments = pulse.commentCount || 0;
        const shares = pulse.shareCount || 0;

        const engagementScore = views * 1.0 + likes * 3.0 + comments * 5.0 + shares * 4.0;
        const ageInHours = Math.max(0.5, (now - new Date(pulse.createdAt).getTime()) / (1000 * 60 * 60));
        const timeDecayFactor = 1 / Math.pow(1 + ageInHours / 24, 1.25);
        const trendingScore = (engagementScore + 1) * timeDecayFactor;

        return {
          id: pulse.id,
          type: 'reel',
          caption: pulse.caption,
          videoUrl: pulse.videoUrl,
          thumbnailUrl: pulse.thumbnailUrl || pulse.videoUrl,
          category: pulse.category || 'Trending',
          viewsCount: views,
          likeCount: likes,
          commentCount: comments,
          shareCount: shares,
          createdAt: pulse.createdAt,
          trendingScore,
          creator: {
            id: prof?.userId || pulse.authorAddress,
            address: pulse.authorAddress,
            username: prof?.username || `user_${authorKey.slice(0, 8)}`,
            displayName: prof?.displayName || `User ${authorKey.slice(0, 6)}`,
            avatarUrl: prof?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${authorKey}`,
          },
        };
      });

    // Combine and apply filter sorting
    const combinedContent = [...enrichedPosts, ...enrichedReels];

    if (filter === 'likes') {
      combinedContent.sort((a, b) => b.likeCount - a.likeCount);
    } else if (filter === 'views') {
      combinedContent.sort((a, b) => b.viewsCount - a.viewsCount);
    } else if (filter === 'recent') {
      combinedContent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // Default: Trending score ranking
      combinedContent.sort((a, b) => b.trendingScore - a.trendingScore);
    }

    // 4. Fetch trending hashtags
    const { data: dbHashtags } = await supabaseServer
      .from('Hashtag')
      .select('*')
      .order('postCount', { ascending: false })
      .limit(8);

    const hashtags = (dbHashtags || []).map((h) => ({
      tag: h.tag.startsWith('#') ? h.tag : `#${h.tag}`,
      postCount: h.postCount,
      trend: '+15%',
      category: 'Trending',
    }));

    // 5. Active top creators
    const topCreators = Array.from(profileMap.values())
      .slice(0, 6)
      .map((p) => ({
        id: p.userId || p.user?.id,
        address: p.user?.walletAddress || p.userId,
        username: p.username,
        displayName: p.displayName || p.username,
        avatarUrl: p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`,
        bio: p.bio,
      }));

    return NextResponse.json({
      success: true,
      filter,
      trendingContent: combinedContent.slice(0, limit),
      trendingPosts: enrichedPosts.slice(0, limit),
      trendingReels: enrichedReels.slice(0, limit),
      topCreators,
      hashtags,
      totalCount: combinedContent.length,
    });
  } catch (error: any) {
    console.error('Error fetching trending data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch trending data' }, { status: 500 });
  }
}
