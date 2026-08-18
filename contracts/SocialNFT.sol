// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SocialNFT
 * @notice ERC721 Contract enabling creators to mint verified social media posts as NFTs.
 */
contract SocialNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    struct NFTRecord {
        uint256 tokenId;
        bytes32 contentHash;
        uint256 postId;
        address creator;
        uint256 mintedAt;
    }

    mapping(uint256 => NFTRecord) private _nftRecords;
    mapping(bytes32 => uint256) private _hashToTokenId;
    mapping(uint256 => uint256) private _postIdToTokenId;

    event PostNFTMinted(
        uint256 indexed tokenId,
        uint256 indexed postId,
        bytes32 indexed contentHash,
        address creator,
        string tokenURI
    );

    constructor() ERC721("SocialProofNFT", "SPNFT") Ownable(msg.sender) {}

    /**
     * @notice Mint a social post as an NFT.
     */
    function mintPostNFT(
        address recipient,
        uint256 postId,
        bytes32 contentHash,
        string memory tokenURI
    ) external nonReentrant returns (uint256) {
        require(recipient != address(0), "SocialNFT: Invalid recipient");
        require(contentHash != bytes32(0), "SocialNFT: Invalid content hash");
        require(_hashToTokenId[contentHash] == 0, "SocialNFT: Content hash already minted as NFT");

        _nextTokenId++;
        uint256 newTokenId = _nextTokenId;

        _safeMint(recipient, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        _nftRecords[newTokenId] = NFTRecord({
            tokenId: newTokenId,
            contentHash: contentHash,
            postId: postId,
            creator: msg.sender,
            mintedAt: block.timestamp
        });

        _hashToTokenId[contentHash] = newTokenId;
        _postIdToTokenId[postId] = newTokenId;

        emit PostNFTMinted(newTokenId, postId, contentHash, recipient, tokenURI);
        return newTokenId;
    }

    /**
     * @notice Get NFT record metadata.
     */
    function getNFTRecord(uint256 tokenId) external view returns (NFTRecord memory) {
        require(tokenId <= _nextTokenId && tokenId > 0, "SocialNFT: Nonexistent token ID");
        return _nftRecords[tokenId];
    }

    /**
     * @notice Get token ID by content hash.
     */
    function getTokenIdByHash(bytes32 contentHash) external view returns (uint256) {
        return _hashToTokenId[contentHash];
    }

    /**
     * @notice Get token ID by post ID.
     */
    function getTokenIdByPostId(uint256 postId) external view returns (uint256) {
        return _postIdToTokenId[postId];
    }

    /**
     * @notice Total minted NFTs count.
     */
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}
