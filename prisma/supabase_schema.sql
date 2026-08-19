-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT,
    "email" TEXT,
    "mobileNumber" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "bannerUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorAddress" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaCid" TEXT NOT NULL DEFAULT '',
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "location" TEXT NOT NULL DEFAULT '',
    "privacy" TEXT NOT NULL DEFAULT 'public',
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "pulseId" TEXT,
    "authorAddress" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "pulseId" TEXT,
    "userAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerAddress" TEXT NOT NULL,
    "followingAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "cid" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hashtag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "postCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pulse" (
    "id" TEXT NOT NULL,
    "authorAddress" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoCid" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Tech',
    "audioTitle" TEXT NOT NULL DEFAULT 'Original Sound',
    "audioId" TEXT,
    "filterName" TEXT DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "privacy" TEXT NOT NULL DEFAULT 'Everyone',
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "allowRemix" BOOLEAN NOT NULL DEFAULT true,
    "allowDownload" BOOLEAN NOT NULL DEFAULT true,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "pulseScore" INTEGER NOT NULL DEFAULT 85,
    "authenticScore" INTEGER NOT NULL DEFAULT 94,
    "remixOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pulse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPulse" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "pulseId" TEXT NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'All',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPulse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "privateAccount" BOOLEAN NOT NULL DEFAULT false,
    "whoCanFollow" TEXT NOT NULL DEFAULT 'everyone',
    "whoCanMessage" TEXT NOT NULL DEFAULT 'everyone',
    "whoCanMention" TEXT NOT NULL DEFAULT 'everyone',
    "whoCanTag" TEXT NOT NULL DEFAULT 'everyone',
    "storyPrivacy" TEXT NOT NULL DEFAULT 'everyone',
    "closeFriends" TEXT NOT NULL DEFAULT '',
    "activityStatus" BOOLEAN NOT NULL DEFAULT true,
    "readReceipts" BOOLEAN NOT NULL DEFAULT true,
    "allowDownloads" BOOLEAN NOT NULL DEFAULT true,
    "allowRemix" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "muteAllNotifications" BOOLEAN NOT NULL DEFAULT false,
    "muteDuration" TEXT NOT NULL DEFAULT 'off',
    "notificationLikes" BOOLEAN NOT NULL DEFAULT true,
    "notificationComments" BOOLEAN NOT NULL DEFAULT true,
    "notificationFollows" BOOLEAN NOT NULL DEFAULT true,
    "notificationMessages" BOOLEAN NOT NULL DEFAULT true,
    "notificationMentions" BOOLEAN NOT NULL DEFAULT true,
    "notificationTags" BOOLEAN NOT NULL DEFAULT true,
    "notificationPulse" BOOLEAN NOT NULL DEFAULT true,
    "notificationLive" BOOLEAN NOT NULL DEFAULT true,
    "notificationDevelopment" BOOLEAN NOT NULL DEFAULT true,
    "notificationCreator" BOOLEAN NOT NULL DEFAULT true,
    "notificationSecurity" BOOLEAN NOT NULL DEFAULT true,
    "notificationPush" BOOLEAN NOT NULL DEFAULT true,
    "sensitiveContent" TEXT NOT NULL DEFAULT 'standard',
    "hiddenWords" TEXT NOT NULL DEFAULT '',
    "contentLanguage" TEXT NOT NULL DEFAULT 'English',
    "autoplay" BOOLEAN NOT NULL DEFAULT true,
    "videoQuality" TEXT NOT NULL DEFAULT 'auto',
    "creatorModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "dataSaver" BOOLEAN NOT NULL DEFAULT false,
    "trendingNotifications" BOOLEAN NOT NULL DEFAULT true,
    "aiSuggestions" BOOLEAN NOT NULL DEFAULT true,
    "trendAlerts" BOOLEAN NOT NULL DEFAULT true,
    "opportunityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "interests" TEXT NOT NULL DEFAULT '',
    "favoriteGenres" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedAccount" (
    "id" TEXT NOT NULL,
    "blockerAddress" TEXT NOT NULL,
    "blockedAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'block',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "deviceName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT '127.0.0.1',
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "authorAddress" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "mediaType" TEXT NOT NULL,
    "textContent" TEXT,
    "textBgColor" TEXT DEFAULT '#121212',
    "audioTitle" TEXT,
    "audioUrl" TEXT,
    "privacy" TEXT NOT NULL DEFAULT 'everyone',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "postId" TEXT,
    "pulseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audio" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL DEFAULT 'Original Artist',
    "url" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Bollywood',
    "language" TEXT NOT NULL DEFAULT 'Hindi',
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "trendGrowth" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'trending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "previewUrl" TEXT NOT NULL DEFAULT '',
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Filter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "View" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT,
    "postId" TEXT,
    "pulseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "View_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL,
    "pulseId" TEXT,
    "postId" TEXT,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "savesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingContent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendingContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpVerification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "email" TEXT,
    "type" TEXT NOT NULL DEFAULT 'mobile',
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPost" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryView" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "viewerAddress" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "deletedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterAddress" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snap" (
    "id" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "receiverAddress" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "caption" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 6,
    "isOpened" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streak" (
    "id" TEXT NOT NULL,
    "user1Address" TEXT NOT NULL,
    "user2Address" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastUser1SnapAt" TIMESTAMP(3),
    "lastUser2SnapAt" TIMESTAMP(3),
    "lastStreakIncrementAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringListing" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "creatorType" TEXT NOT NULL,
    "listingType" TEXT NOT NULL DEFAULT 'promotion',
    "category" TEXT NOT NULL DEFAULT 'General',
    "location" TEXT NOT NULL DEFAULT 'Jaipur, India',
    "isOpenForCollab" BOOLEAN NOT NULL DEFAULT true,
    "startingPrice" INTEGER NOT NULL DEFAULT 1000,
    "services" TEXT NOT NULL DEFAULT 'Story Promotion, Reel Promotion, Product Review, Brand Collaboration',
    "packages" TEXT NOT NULL DEFAULT '[{"name":"Story","price":500},{"name":"Post","price":1000},{"name":"Reel","price":2000},{"name":"Product Review","price":3000}]',
    "isNegotiable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HiringRequest" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "senderAddress" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "service" TEXT NOT NULL DEFAULT 'Brand Collaboration',
    "budget" INTEGER NOT NULL DEFAULT 2000,
    "deadline" TEXT NOT NULL DEFAULT 'Within 7 days',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedCreator" (
    "id" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedCreator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "creatorAddress" TEXT NOT NULL,
    "clientAddress" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "deliverables" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'request',
    "currentOfferBy" TEXT NOT NULL DEFAULT 'client',
    "termsLocked" BOOLEAN NOT NULL DEFAULT false,
    "deliverableUrl" TEXT NOT NULL DEFAULT '',
    "deliverableNotes" TEXT NOT NULL DEFAULT '',
    "timelineUpdates" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollabReview" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "reviewerAddress" TEXT NOT NULL,
    "targetAddress" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL DEFAULT 'Client',
    "rating" INTEGER NOT NULL DEFAULT 5,
    "reviewText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollabReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobileNumber_key" ON "User"("mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_username_key" ON "Profile"("username");

-- CreateIndex
CREATE INDEX "Post_authorAddress_idx" ON "Post"("authorAddress");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_pulseId_idx" ON "Comment"("pulseId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_postId_userAddress_key" ON "Like"("postId", "userAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Like_pulseId_userAddress_key" ON "Like"("pulseId", "userAddress");

-- CreateIndex
CREATE INDEX "Follow_followerAddress_idx" ON "Follow"("followerAddress");

-- CreateIndex
CREATE INDEX "Follow_followingAddress_idx" ON "Follow"("followingAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerAddress_followingAddress_key" ON "Follow"("followerAddress", "followingAddress");

-- CreateIndex
CREATE INDEX "Notification_recipientAddress_idx" ON "Notification"("recipientAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Media_cid_key" ON "Media"("cid");

-- CreateIndex
CREATE UNIQUE INDEX "Hashtag_tag_key" ON "Hashtag"("tag");

-- CreateIndex
CREATE INDEX "Pulse_authorAddress_idx" ON "Pulse"("authorAddress");

-- CreateIndex
CREATE INDEX "Pulse_pulseScore_idx" ON "Pulse"("pulseScore");

-- CreateIndex
CREATE INDEX "SavedPulse_userAddress_idx" ON "SavedPulse"("userAddress");

-- CreateIndex
CREATE INDEX "SavedPulse_pulseId_idx" ON "SavedPulse"("pulseId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPulse_userAddress_pulseId_key" ON "SavedPulse"("userAddress", "pulseId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_walletAddress_key" ON "UserSettings"("walletAddress");

-- CreateIndex
CREATE INDEX "BlockedAccount_blockerAddress_idx" ON "BlockedAccount"("blockerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedAccount_blockerAddress_blockedAddress_type_key" ON "BlockedAccount"("blockerAddress", "blockedAddress", "type");

-- CreateIndex
CREATE INDEX "UserSession_walletAddress_idx" ON "UserSession"("walletAddress");

-- CreateIndex
CREATE INDEX "Story_authorAddress_idx" ON "Story"("authorAddress");

-- CreateIndex
CREATE INDEX "Story_expiresAt_idx" ON "Story"("expiresAt");

-- CreateIndex
CREATE INDEX "Share_userAddress_idx" ON "Share"("userAddress");

-- CreateIndex
CREATE INDEX "View_userAddress_idx" ON "View"("userAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Analytics_pulseId_key" ON "Analytics"("pulseId");

-- CreateIndex
CREATE UNIQUE INDEX "Analytics_postId_key" ON "Analytics"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "OtpVerification_identifier_key" ON "OtpVerification"("identifier");

-- CreateIndex
CREATE INDEX "OtpVerification_identifier_idx" ON "OtpVerification"("identifier");

-- CreateIndex
CREATE INDEX "OtpVerification_mobileNumber_idx" ON "OtpVerification"("mobileNumber");

-- CreateIndex
CREATE INDEX "OtpVerification_email_idx" ON "OtpVerification"("email");

-- CreateIndex
CREATE INDEX "SavedPost_userAddress_idx" ON "SavedPost"("userAddress");

-- CreateIndex
CREATE INDEX "SavedPost_postId_idx" ON "SavedPost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPost_userAddress_postId_key" ON "SavedPost"("userAddress", "postId");

-- CreateIndex
CREATE INDEX "StoryView_storyId_idx" ON "StoryView"("storyId");

-- CreateIndex
CREATE INDEX "StoryView_viewerAddress_idx" ON "StoryView"("viewerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "StoryView_storyId_viewerAddress_key" ON "StoryView"("storyId", "viewerAddress");

-- CreateIndex
CREATE INDEX "ConversationMember_conversationId_idx" ON "ConversationMember"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationMember_userAddress_idx" ON "ConversationMember"("userAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMember_conversationId_userAddress_key" ON "ConversationMember"("conversationId", "userAddress");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_senderAddress_idx" ON "Message"("senderAddress");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Report_reporterAddress_idx" ON "Report"("reporterAddress");

-- CreateIndex
CREATE INDEX "Report_targetId_idx" ON "Report"("targetId");

-- CreateIndex
CREATE INDEX "Snap_senderAddress_idx" ON "Snap"("senderAddress");

-- CreateIndex
CREATE INDEX "Snap_receiverAddress_idx" ON "Snap"("receiverAddress");

-- CreateIndex
CREATE INDEX "Snap_createdAt_idx" ON "Snap"("createdAt");

-- CreateIndex
CREATE INDEX "Streak_user1Address_idx" ON "Streak"("user1Address");

-- CreateIndex
CREATE INDEX "Streak_user2Address_idx" ON "Streak"("user2Address");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_user1Address_user2Address_key" ON "Streak"("user1Address", "user2Address");

-- CreateIndex
CREATE UNIQUE INDEX "HiringListing_userAddress_key" ON "HiringListing"("userAddress");

-- CreateIndex
CREATE INDEX "HiringListing_userAddress_idx" ON "HiringListing"("userAddress");

-- CreateIndex
CREATE INDEX "HiringListing_creatorType_idx" ON "HiringListing"("creatorType");

-- CreateIndex
CREATE INDEX "HiringListing_listingType_idx" ON "HiringListing"("listingType");

-- CreateIndex
CREATE INDEX "HiringListing_location_idx" ON "HiringListing"("location");

-- CreateIndex
CREATE INDEX "HiringListing_isOpenForCollab_idx" ON "HiringListing"("isOpenForCollab");

-- CreateIndex
CREATE INDEX "HiringRequest_listingId_idx" ON "HiringRequest"("listingId");

-- CreateIndex
CREATE INDEX "HiringRequest_senderAddress_idx" ON "HiringRequest"("senderAddress");

-- CreateIndex
CREATE INDEX "HiringRequest_status_idx" ON "HiringRequest"("status");

-- CreateIndex
CREATE INDEX "SavedCreator_userAddress_idx" ON "SavedCreator"("userAddress");

-- CreateIndex
CREATE INDEX "SavedCreator_listingId_idx" ON "SavedCreator"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedCreator_userAddress_listingId_key" ON "SavedCreator"("userAddress", "listingId");

-- CreateIndex
CREATE INDEX "Deal_creatorAddress_idx" ON "Deal"("creatorAddress");

-- CreateIndex
CREATE INDEX "Deal_clientAddress_idx" ON "Deal"("clientAddress");

-- CreateIndex
CREATE INDEX "Deal_status_idx" ON "Deal"("status");

-- CreateIndex
CREATE INDEX "CollabReview_dealId_idx" ON "CollabReview"("dealId");

-- CreateIndex
CREATE INDEX "CollabReview_targetAddress_idx" ON "CollabReview"("targetAddress");

-- CreateIndex
CREATE INDEX "CollabReview_reviewerAddress_idx" ON "CollabReview"("reviewerAddress");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_pulseId_fkey" FOREIGN KEY ("pulseId") REFERENCES "Pulse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_pulseId_fkey" FOREIGN KEY ("pulseId") REFERENCES "Pulse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pulse" ADD CONSTRAINT "Pulse_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "Audio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPulse" ADD CONSTRAINT "SavedPulse_pulseId_fkey" FOREIGN KEY ("pulseId") REFERENCES "Pulse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_pulseId_fkey" FOREIGN KEY ("pulseId") REFERENCES "Pulse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "View" ADD CONSTRAINT "View_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "View" ADD CONSTRAINT "View_pulseId_fkey" FOREIGN KEY ("pulseId") REFERENCES "Pulse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_pulseId_fkey" FOREIGN KEY ("pulseId") REFERENCES "Pulse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPost" ADD CONSTRAINT "SavedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryView" ADD CONSTRAINT "StoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringRequest" ADD CONSTRAINT "HiringRequest_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "HiringListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedCreator" ADD CONSTRAINT "SavedCreator_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "HiringListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabReview" ADD CONSTRAINT "CollabReview_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

