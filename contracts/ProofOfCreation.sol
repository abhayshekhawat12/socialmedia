// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProofOfCreation
 * @notice Core Web3 Identity and Cryptographic Content Authenticity Registry.
 * Provides immutable Proof-of-Creation tracking for social media content.
 */
contract ProofOfCreation is ReentrancyGuard {

    struct UserProfile {
        address walletAddress;
        string web3ProfileId;
        string profileCID;
        uint256 registeredAt;
        bool exists;
    }

    struct ContentProof {
        uint256 proofId;
        bytes32 contentHash;
        address creator;
        string metadataCID;
        uint256 timestamp;
        bool exists;
        bool isMintedAsNft;
        uint256 nftTokenId;
    }

    // Counters
    uint256 private _proofCounter;
    uint256 private _userCounter;

    // Mappings
    mapping(address => UserProfile) private _profiles;
    mapping(bytes32 => ContentProof) private _proofsByHash;
    mapping(uint256 => bytes32) private _proofHashById;
    mapping(address => bytes32[]) private _creatorProofHashes;

    // Events
    event ProfileRegistered(address indexed user, string web3ProfileId, string profileCID, uint256 timestamp);
    event ProfileUpdated(address indexed user, string profileCID);
    event ProofRegistered(uint256 indexed proofId, bytes32 indexed contentHash, address indexed creator, string metadataCID, uint256 timestamp);
    event NftStatusUpdated(bytes32 indexed contentHash, uint256 tokenId);

    modifier onlyRegistered() {
        require(_profiles[msg.sender].exists, "ProofOfCreation: User profile not registered");
        _;
    }

    /**
     * @notice Register a new Web3 Profile or update existing metadata.
     */
    function registerOrUpdateProfile(string memory web3ProfileId, string memory profileCID) external {
        require(bytes(profileCID).length > 0, "ProofOfCreation: Invalid profile CID");

        if (!_profiles[msg.sender].exists) {
            _userCounter++;
            _profiles[msg.sender] = UserProfile({
                walletAddress: msg.sender,
                web3ProfileId: web3ProfileId,
                profileCID: profileCID,
                registeredAt: block.timestamp,
                exists: true
            });
            emit ProfileRegistered(msg.sender, web3ProfileId, profileCID, block.timestamp);
        } else {
            _profiles[msg.sender].profileCID = profileCID;
            emit ProfileUpdated(msg.sender, profileCID);
        }
    }

    /**
     * @notice Register a cryptographic content fingerprint (Proof-of-Creation).
     */
    function registerContentProof(bytes32 contentHash, string memory metadataCID) external returns (uint256) {
        require(contentHash != bytes32(0), "ProofOfCreation: Invalid content hash");
        require(bytes(metadataCID).length > 0, "ProofOfCreation: Invalid metadata CID");
        require(!_proofsByHash[contentHash].exists, "ProofOfCreation: Content hash already registered");

        _proofCounter++;
        ContentProof memory newProof = ContentProof({
            proofId: _proofCounter,
            contentHash: contentHash,
            creator: msg.sender,
            metadataCID: metadataCID,
            timestamp: block.timestamp,
            exists: true,
            isMintedAsNft: false,
            nftTokenId: 0
        });

        _proofsByHash[contentHash] = newProof;
        _proofHashById[_proofCounter] = contentHash;
        _creatorProofHashes[msg.sender].push(contentHash);

        emit ProofRegistered(_proofCounter, contentHash, msg.sender, metadataCID, block.timestamp);
        return _proofCounter;
    }

    /**
     * @notice Update proof record when minted as NFT.
     */
    function updateNftStatus(bytes32 contentHash, uint256 tokenId) external {
        require(_proofsByHash[contentHash].exists, "ProofOfCreation: Proof does not exist");
        require(_proofsByHash[contentHash].creator == msg.sender, "ProofOfCreation: Only creator can update NFT status");

        _proofsByHash[contentHash].isMintedAsNft = true;
        _proofsByHash[contentHash].nftTokenId = tokenId;

        emit NftStatusUpdated(contentHash, tokenId);
    }

    /**
     * @notice Verify content authenticity by hash.
     */
    function verifyContent(bytes32 contentHash) external view returns (
        bool exists,
        address creator,
        string memory metadataCID,
        uint256 timestamp,
        uint256 proofId,
        bool isMintedAsNft,
        uint256 nftTokenId
    ) {
        ContentProof memory proof = _proofsByHash[contentHash];
        return (
            proof.exists,
            proof.creator,
            proof.metadataCID,
            proof.timestamp,
            proof.proofId,
            proof.isMintedAsNft,
            proof.nftTokenId
        );
    }

    /**
     * @notice Get user profile details.
     */
    function getProfile(address user) external view returns (UserProfile memory) {
        return _profiles[user];
    }

    /**
     * @notice Get total registered proofs count.
     */
    function getTotalProofs() external view returns (uint256) {
        return _proofCounter;
    }

    /**
     * @notice Get user's created proof hashes.
     */
    function getCreatorProofs(address creator) external view returns (bytes32[] memory) {
        return _creatorProofHashes[creator];
    }
}
