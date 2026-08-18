// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SocialMedia
 * @dev BlockSocial Smart Contract featuring Content DNA, Permanent Remix Chaining,
 * Content Lineage Tracking, and Automated Creator Royalty Engine.
 */
contract SocialMedia is ReentrancyGuard {
    
    // Structs
    struct Profile {
        address userAddress;
        string profileCID;
        bool exists;
        uint256 totalTipsReceived;
        uint256 totalRoyaltiesEarned;
        uint256 createdAt;
    }

    struct Comment {
        uint256 commentId;
        uint256 postId;
        address commenter;
        string commentCID;
        uint256 timestamp;
    }

    struct ContentDNA {
        uint256 dnaId;
        uint256 postId;
        address originalCreator;
        address currentOwner;
        uint256 parentDnaId;
        bytes32 contentHash;
        string metadataCID;
        uint256 royaltyPercentage; // Basis points (1000 = 10%)
        uint256 remixCount;
        uint256 timestamp;
    }

    struct Post {
        uint256 id;
        uint256 dnaId;
        address author;
        string metadataCID;
        uint256 likeCount;
        uint256 commentCount;
        uint256 tipTotal;
        uint256 timestamp;
        bool exists;
        bool isRemix;
        uint256 parentPostId;
    }

    // Counters
    uint256 private _postCounter;
    uint256 private _commentCounter;
    uint256 private _dnaCounter;

    // Mappings
    mapping(address => Profile) private _profiles;
    mapping(uint256 => Post) private _posts;
    mapping(uint256 => ContentDNA) private _contentDNAs;
    mapping(uint256 => mapping(address => bool)) private _postLikes;
    mapping(uint256 => Comment[]) private _postComments;

    // Content Lineage: Parent DNA ID => Child DNA IDs array
    mapping(uint256 => uint256[]) private _remixDescendants;

    // Follower Mappings
    mapping(address => mapping(address => bool)) private _isFollowing;
    mapping(address => address[]) private _followers;
    mapping(address => address[]) private _following;

    // User Posts & Remixes Tracking
    mapping(address => uint256[]) private _userPostIds;
    mapping(address => uint256[]) private _userRemixDnaIds;

    // Events
    event ProfileUpdated(address indexed user, string profileCID);
    event PostCreated(uint256 indexed postId, address indexed author, string metadataCID, uint256 timestamp);
    event OriginalContentCreated(uint256 indexed dnaId, uint256 indexed postId, address indexed creator, bytes32 contentHash, uint256 royaltyPercentage);
    event ContentRemixed(uint256 indexed newDnaId, uint256 indexed parentDnaId, uint256 postId, address indexed remixer, address originalCreator);
    event PostLiked(uint256 indexed postId, address indexed liker, uint256 totalLikes);
    event PostUnliked(uint256 indexed postId, address indexed unliker, uint256 totalLikes);
    event CommentAdded(uint256 indexed postId, address indexed commenter, string commentCID, uint256 timestamp);
    event UserFollowed(address indexed follower, address indexed followed);
    event UserUnfollowed(address indexed follower, address indexed unfollowed);
    event CreatorTipped(uint256 indexed postId, address indexed tipper, address indexed creator, uint256 amount);
    event RoyaltyDistributed(uint256 indexed postId, address indexed originalCreator, address indexed remixer, uint256 originalShare, uint256 remixerShare);

    modifier postExists(uint256 _postId) {
        require(_posts[_postId].exists, "SocialMedia: Post does not exist");
        _;
    }

    // --- Profile Management ---

    function updateProfile(string memory _profileCID) external {
        require(bytes(_profileCID).length > 0, "SocialMedia: Invalid profile CID");
        
        if (!_profiles[msg.sender].exists) {
            _profiles[msg.sender] = Profile({
                userAddress: msg.sender,
                profileCID: _profileCID,
                exists: true,
                totalTipsReceived: 0,
                totalRoyaltiesEarned: 0,
                createdAt: block.timestamp
            });
        } else {
            _profiles[msg.sender].profileCID = _profileCID;
        }

        emit ProfileUpdated(msg.sender, _profileCID);
    }

    function getUserProfile(address _user) external view returns (Profile memory) {
        if (!_profiles[_user].exists) {
            return Profile({
                userAddress: _user,
                profileCID: "",
                exists: false,
                totalTipsReceived: 0,
                totalRoyaltiesEarned: 0,
                createdAt: 0
            });
        }
        return _profiles[_user];
    }

    // --- Content DNA & Post Creation ---

    /**
     * @notice Create an Original Post with unique Content DNA and configurable royalty percentage (in basis points, e.g. 1000 = 10%)
     */
    function createOriginalPost(
        string memory _metadataCID,
        bytes32 _contentHash,
        uint256 _royaltyPercentage
    ) external returns (uint256) {
        require(bytes(_metadataCID).length > 0, "SocialMedia: Invalid metadata CID");
        require(_royaltyPercentage <= 5000, "SocialMedia: Royalty cannot exceed 50%");

        _postCounter++;
        _dnaCounter++;

        uint256 newPostId = _postCounter;
        uint256 newDnaId = _dnaCounter;

        _contentDNAs[newDnaId] = ContentDNA({
            dnaId: newDnaId,
            postId: newPostId,
            originalCreator: msg.sender,
            currentOwner: msg.sender,
            parentDnaId: 0,
            contentHash: _contentHash,
            metadataCID: _metadataCID,
            royaltyPercentage: _royaltyPercentage,
            remixCount: 0,
            timestamp: block.timestamp
        });

        _posts[newPostId] = Post({
            id: newPostId,
            dnaId: newDnaId,
            author: msg.sender,
            metadataCID: _metadataCID,
            likeCount: 0,
            commentCount: 0,
            tipTotal: 0,
            timestamp: block.timestamp,
            exists: true,
            isRemix: false,
            parentPostId: 0
        });

        _userPostIds[msg.sender].push(newPostId);

        emit PostCreated(newPostId, msg.sender, _metadataCID, block.timestamp);
        emit OriginalContentCreated(newDnaId, newPostId, msg.sender, _contentHash, _royaltyPercentage);

        return newPostId;
    }

    /**
     * @notice Create a Remix linked permanently to a parent Content DNA
     */
    function createRemix(
        uint256 _parentDnaId,
        string memory _metadataCID,
        bytes32 _contentHash
    ) external returns (uint256) {
        require(bytes(_metadataCID).length > 0, "SocialMedia: Invalid metadata CID");
        require(_contentDNAs[_parentDnaId].dnaId > 0, "SocialMedia: Parent Content DNA does not exist");

        _postCounter++;
        _dnaCounter++;

        uint256 newPostId = _postCounter;
        uint256 newDnaId = _dnaCounter;

        ContentDNA storage parentDNA = _contentDNAs[_parentDnaId];
        parentDNA.remixCount += 1;

        _contentDNAs[newDnaId] = ContentDNA({
            dnaId: newDnaId,
            postId: newPostId,
            originalCreator: parentDNA.originalCreator,
            currentOwner: msg.sender,
            parentDnaId: _parentDnaId,
            contentHash: _contentHash,
            metadataCID: _metadataCID,
            royaltyPercentage: parentDNA.royaltyPercentage,
            remixCount: 0,
            timestamp: block.timestamp
        });

        _posts[newPostId] = Post({
            id: newPostId,
            dnaId: newDnaId,
            author: msg.sender,
            metadataCID: _metadataCID,
            likeCount: 0,
            commentCount: 0,
            tipTotal: 0,
            timestamp: block.timestamp,
            exists: true,
            isRemix: true,
            parentPostId: parentDNA.postId
        });

        _remixDescendants[_parentDnaId].push(newDnaId);
        _userPostIds[msg.sender].push(newPostId);
        _userRemixDnaIds[msg.sender].push(newDnaId);

        emit PostCreated(newPostId, msg.sender, _metadataCID, block.timestamp);
        emit ContentRemixed(newDnaId, _parentDnaId, newPostId, msg.sender, parentDNA.originalCreator);

        return newPostId;
    }

    /**
     * @notice Legacy / Simplified createPost wrapper
     */
    function createPost(string memory _metadataCID) external returns (uint256) {
        bytes32 dummyHash = keccak256(abi.encodePacked(_metadataCID, block.timestamp, msg.sender));
        return this.createOriginalPost(_metadataCID, dummyHash, 1000); // Default 10% royalty
    }

    // --- Content Lineage Queries ---

    function getContentDNA(uint256 _dnaId) external view returns (ContentDNA memory) {
        require(_contentDNAs[_dnaId].dnaId > 0, "SocialMedia: Content DNA not found");
        return _contentDNAs[_dnaId];
    }

    function getRemixDescendants(uint256 _dnaId) external view returns (uint256[] memory) {
        return _remixDescendants[_dnaId];
    }

    function getPost(uint256 _postId) external view postExists(_postId) returns (Post memory) {
        return _posts[_postId];
    }

    function getAllPosts() external view returns (Post[] memory) {
        Post[] memory allPosts = new Post[](_postCounter);
        for (uint256 i = 1; i <= _postCounter; i++) {
            allPosts[i - 1] = _posts[i];
        }
        return allPosts;
    }

    function getUserPosts(address _user) external view returns (Post[] memory) {
        uint256[] memory postIds = _userPostIds[_user];
        Post[] memory userPosts = new Post[](postIds.length);
        for (uint256 i = 0; i < postIds.length; i++) {
            userPosts[i] = _posts[postIds[i]];
        }
        return userPosts;
    }

    // --- Likes & Comments ---

    function likePost(uint256 _postId) external postExists(_postId) {
        require(!_postLikes[_postId][msg.sender], "SocialMedia: Post already liked");
        _postLikes[_postId][msg.sender] = true;
        _posts[_postId].likeCount += 1;
        emit PostLiked(_postId, msg.sender, _posts[_postId].likeCount);
    }

    function unlikePost(uint256 _postId) external postExists(_postId) {
        require(_postLikes[_postId][msg.sender], "SocialMedia: Post not liked");
        _postLikes[_postId][msg.sender] = false;
        _posts[_postId].likeCount -= 1;
        emit PostUnliked(_postId, msg.sender, _posts[_postId].likeCount);
    }

    function hasUserLikedPost(uint256 _postId, address _user) external view returns (bool) {
        return _postLikes[_postId][_user];
    }

    function commentOnPost(uint256 _postId, string memory _commentCID) external postExists(_postId) {
        require(bytes(_commentCID).length > 0, "SocialMedia: Invalid comment CID");
        _commentCounter++;
        Comment memory newComment = Comment({
            commentId: _commentCounter,
            postId: _postId,
            commenter: msg.sender,
            commentCID: _commentCID,
            timestamp: block.timestamp
        });
        _postComments[_postId].push(newComment);
        _posts[_postId].commentCount += 1;
        emit CommentAdded(_postId, msg.sender, _commentCID, block.timestamp);
    }

    function getPostComments(uint256 _postId) external view postExists(_postId) returns (Comment[] memory) {
        return _postComments[_postId];
    }

    // --- Follow System ---

    function followUser(address _userToFollow) external {
        require(_userToFollow != address(0) && _userToFollow != msg.sender, "SocialMedia: Invalid target user");
        require(!_isFollowing[msg.sender][_userToFollow], "SocialMedia: Already following");

        _isFollowing[msg.sender][_userToFollow] = true;
        _following[msg.sender].push(_userToFollow);
        _followers[_userToFollow].push(msg.sender);

        emit UserFollowed(msg.sender, _userToFollow);
    }

    function unfollowUser(address _userToUnfollow) external {
        require(_isFollowing[msg.sender][_userToUnfollow], "SocialMedia: Not following");

        _isFollowing[msg.sender][_userToUnfollow] = false;
        _removeAddressFromArray(_following[msg.sender], _userToUnfollow);
        _removeAddressFromArray(_followers[_userToUnfollow], msg.sender);

        emit UserUnfollowed(msg.sender, _userToUnfollow);
    }

    function isFollowing(address _follower, address _followed) external view returns (bool) {
        return _isFollowing[_follower][_followed];
    }

    function getFollowers(address _user) external view returns (address[] memory) {
        return _followers[_user];
    }

    function getFollowing(address _user) external view returns (address[] memory) {
        return _following[_user];
    }

    // --- Automated Creator Royalty Engine ---

    /**
     * @notice Send ETH tip. If the post is a remix, automatically splits tip according to the original creator's royalty percentage.
     */
    function tipCreator(uint256 _postId) external payable nonReentrant postExists(_postId) {
        require(msg.value > 0, "SocialMedia: Tip must be greater than zero");

        Post storage post = _posts[_postId];
        ContentDNA memory dna = _contentDNAs[post.dnaId];

        post.tipTotal += msg.value;

        if (post.isRemix && dna.originalCreator != address(0) && dna.originalCreator != post.author && dna.royaltyPercentage > 0) {
            uint256 originalShare = (msg.value * dna.royaltyPercentage) / 10000;
            uint256 remixerShare = msg.value - originalShare;

            if (_profiles[dna.originalCreator].exists) {
                _profiles[dna.originalCreator].totalRoyaltiesEarned += originalShare;
                _profiles[dna.originalCreator].totalTipsReceived += originalShare;
            }
            if (_profiles[post.author].exists) {
                _profiles[post.author].totalTipsReceived += remixerShare;
            }

            (bool successOriginal, ) = payable(dna.originalCreator).call{value: originalShare}("");
            require(successOriginal, "SocialMedia: Original creator royalty transfer failed");

            (bool successRemixer, ) = payable(post.author).call{value: remixerShare}("");
            require(successRemixer, "SocialMedia: Remix author tip transfer failed");

            emit RoyaltyDistributed(_postId, dna.originalCreator, post.author, originalShare, remixerShare);
        } else {
            if (_profiles[post.author].exists) {
                _profiles[post.author].totalTipsReceived += msg.value;
            }
            (bool success, ) = payable(post.author).call{value: msg.value}("");
            require(success, "SocialMedia: ETH tip transfer failed");
        }

        emit CreatorTipped(_postId, msg.sender, post.author, msg.value);
    }

    // --- Creator Metrics & Passport ---

    function getCreatorMetrics(address _user) external view returns (
        uint256 originalCount,
        uint256 remixCount,
        uint256 totalTips,
        uint256 royaltiesEarned,
        uint256 impactScore
    ) {
        uint256[] memory postIds = _userPostIds[_user];
        uint256 orig = 0;
        uint256 rem = 0;
        for (uint256 i = 0; i < postIds.length; i++) {
            if (_posts[postIds[i]].isRemix) {
                rem++;
            } else {
                orig++;
            }
        }
        uint256 tips = _profiles[_user].totalTipsReceived;
        uint256 royalties = _profiles[_user].totalRoyaltiesEarned;

        // Transparent Creator Impact Score Formula
        // Impact = (Originals * 15) + (Remixes * 10) + (Followers * 5) + (Tips / 10^15 wei)
        uint256 followersCount = _followers[_user].length;
        uint256 tipPoints = tips / 1e15; // 0.001 ETH = 1 point
        uint256 score = (orig * 15) + (rem * 10) + (followersCount * 5) + tipPoints;

        return (orig, rem, tips, royalties, score);
    }

    // --- Internal Helpers ---

    function _removeAddressFromArray(address[] storage arr, address target) private {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == target) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                break;
            }
        }
    }
}
