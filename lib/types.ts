export interface UserProfile {
  userAddress: string;
  username: string;
  displayName: string;
  bio: string;
  profileImage: string;
  coverImage: string;
  exists: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: number;
}

export interface PostMetadata {
  content: string;
  media: string[];
  mediaType?: 'image' | 'video' | 'mixed';
  hashtags: string[];
  createdAt: number;
  authorWallet?: string;
}

export interface PostItem {
  id: string | number;
  author: string;
  mediaUrl: string;
  caption?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string | number;
  isLikedByCurrentUser?: boolean;
  authorProfile?: UserProfile;
}

export interface PostComment {
  id: string;
  postId: string;
  authorAddress: string;
  content: string;
  createdAt: string;
  authorProfile?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}
