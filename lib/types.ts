export interface UserProfile {
  userAddress: string;
  username: string;
  displayName: string;
  bio: string;
  profileImage: string;
  coverImage: string;
  exists: boolean;
  totalTipsReceived: string; // in ETH
  totalRoyaltiesEarned: string; // in ETH
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: number;
  profileCID?: string;
}

export interface ContentDNA {
  dnaId: number;
  postId: number;
  originalCreator: string;
  currentOwner: string;
  parentDnaId: number;
  contentHash: string;
  metadataCID: string;
  royaltyPercentage: number; // e.g. 1000 = 10%
  remixCount: number;
  timestamp: number;
}

export interface PostMetadata {
  content: string;
  media: string[];
  mediaType?: 'image' | 'video' | 'mixed';
  hashtags: string[];
  createdAt: number;
  authorWallet?: string;
  remixParentId?: number;
  remixParentAuthor?: string;
}

export interface PostItem {
  id: number;
  dnaId: number;
  author: string;
  metadataCID: string;
  metadata?: PostMetadata;
  likeCount: number;
  commentCount: number;
  tipTotal: string; // in ETH
  timestamp: number;
  exists: boolean;
  isRemix: boolean;
  parentPostId: number;
  dna?: ContentDNA;
  isLikedByCurrentUser?: boolean;
  authorProfile?: UserProfile;
  txHash?: string;
  blockNumber?: number;
}

export interface CreatorMetrics {
  originalCount: number;
  remixCount: number;
  totalTips: string;
  royaltiesEarned: string;
  impactScore: number;
}

export interface PostComment {
  commentId: number;
  postId: number;
  commenter: string;
  commentCID: string;
  content?: string;
  timestamp: number;
  commenterProfile?: UserProfile;
}

export interface TransactionStatusState {
  isOpen: boolean;
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  title?: string;
  message?: string;
  txHash?: string;
  errorMessage?: string;
}
