import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Proof-of-Creation & SocialNFT Smart Contracts", function () {
  let proofOfCreation: any;
  let socialNFT: any;
  let owner: HardhatEthersSigner;
  let creator1: HardhatEthersSigner;
  let creator2: HardhatEthersSigner;

  const sampleContentHash = ethers.keccak256(ethers.toUtf8Bytes("Sample Post Content Verification Fingerprint"));
  const sampleMetadataCID = "ipfs://QmSamplePostMetadataCID123456789";

  beforeEach(async function () {
    [owner, creator1, creator2] = await ethers.getSigners();

    const ProofOfCreationFactory = await ethers.getContractFactory("ProofOfCreation");
    proofOfCreation = await ProofOfCreationFactory.deploy();
    await proofOfCreation.waitForDeployment();

    const SocialNFTFactory = await ethers.getContractFactory("SocialNFT");
    socialNFT = await SocialNFTFactory.deploy();
    await socialNFT.waitForDeployment();
  });

  describe("Web3 Profile Registration", function () {
    it("should allow a user to register a Web3 profile", async function () {
      await proofOfCreation.connect(creator1).registerOrUpdateProfile("web3_creator1", "ipfs://QmProfile1");
      const profile = await proofOfCreation.getProfile(creator1.address);

      expect(profile.exists).to.be.true;
      expect(profile.web3ProfileId).to.equal("web3_creator1");
      expect(profile.profileCID).to.equal("ipfs://QmProfile1");
      expect(profile.walletAddress).to.equal(creator1.address);
    });

    it("should allow a user to update profile metadata CID", async function () {
      await proofOfCreation.connect(creator1).registerOrUpdateProfile("web3_creator1", "ipfs://QmProfile1");
      await proofOfCreation.connect(creator1).registerOrUpdateProfile("web3_creator1", "ipfs://QmUpdatedProfile1");

      const profile = await proofOfCreation.getProfile(creator1.address);
      expect(profile.profileCID).to.equal("ipfs://QmUpdatedProfile1");
    });
  });

  describe("Proof-of-Creation Content Hashing & Verification", function () {
    it("should register a unique content proof on-chain", async function () {
      const tx = await proofOfCreation.connect(creator1).registerContentProof(sampleContentHash, sampleMetadataCID);
      await tx.wait();

      const verified = await proofOfCreation.verifyContent(sampleContentHash);
      expect(verified.exists).to.be.true;
      expect(verified.creator).to.equal(creator1.address);
      expect(verified.metadataCID).to.equal(sampleMetadataCID);
      expect(verified.proofId).to.equal(1);
    });

    it("should prevent duplicate content hash registration", async function () {
      await proofOfCreation.connect(creator1).registerContentProof(sampleContentHash, sampleMetadataCID);

      await expect(
        proofOfCreation.connect(creator2).registerContentProof(sampleContentHash, "ipfs://QmDuplicateCID")
      ).to.be.revertedWith("ProofOfCreation: Content hash already registered");
    });

    it("should track creator's registered proof hashes", async function () {
      await proofOfCreation.connect(creator1).registerContentProof(sampleContentHash, sampleMetadataCID);
      const proofs = await proofOfCreation.getCreatorProofs(creator1.address);

      expect(proofs.length).to.equal(1);
      expect(proofs[0]).to.equal(sampleContentHash);
    });
  });

  describe("SocialNFT Minting", function () {
    it("should allow minting a verified post as an NFT", async function () {
      await proofOfCreation.connect(creator1).registerContentProof(sampleContentHash, sampleMetadataCID);

      const tokenURI = "ipfs://QmTokenUriMetadata123";
      const postId = 101;

      const mintTx = await socialNFT.connect(creator1).mintPostNFT(
        creator1.address,
        postId,
        sampleContentHash,
        tokenURI
      );
      await mintTx.wait();

      expect(await socialNFT.ownerOf(1)).to.equal(creator1.address);
      expect(await socialNFT.tokenURI(1)).to.equal(tokenURI);

      const record = await socialNFT.getNFTRecord(1);
      expect(record.creator).to.equal(creator1.address);
      expect(record.contentHash).to.equal(sampleContentHash);
    });

    it("should prevent minting the same content hash twice as NFT", async function () {
      await socialNFT.connect(creator1).mintPostNFT(creator1.address, 1, sampleContentHash, "ipfs://URI1");

      await expect(
        socialNFT.connect(creator1).mintPostNFT(creator1.address, 2, sampleContentHash, "ipfs://URI2")
      ).to.be.revertedWith("SocialNFT: Content hash already minted as NFT");
    });
  });
});
