import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SocialMedia Contract with Content DNA & Royalty Engine", function () {
  let socialMedia: any;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    const SocialMediaFactory = await ethers.getContractFactory("SocialMedia");
    socialMedia = await SocialMediaFactory.deploy();
    await socialMedia.waitForDeployment();
  });

  describe("Content DNA & Remix Chains", function () {
    it("should create an original post with Content DNA and royalty percentage", async function () {
      const metadataCID = "ipfs://QmOriginalContent1";
      const contentHash = ethers.id("Original Text Content");
      const royaltyPct = 1000; // 10%

      await expect(
        socialMedia.connect(user1).createOriginalPost(metadataCID, contentHash, royaltyPct)
      )
        .to.emit(socialMedia, "OriginalContentCreated")
        .withArgs(1, 1, user1.address, contentHash, royaltyPct);

      const dna = await socialMedia.getContentDNA(1);
      expect(dna.dnaId).to.equal(1);
      expect(dna.originalCreator).to.equal(user1.address);
      expect(dna.parentDnaId).to.equal(0);
      expect(dna.royaltyPercentage).to.equal(1000);
      expect(dna.remixCount).to.equal(0);
    });

    it("should allow user2 to remix user1's original post and link parent DNA", async function () {
      const hash1 = ethers.id("Original Text Content");
      await socialMedia.connect(user1).createOriginalPost("ipfs://QmOriginal", hash1, 1000);

      const remixHash = ethers.id("Remixed Content");
      await expect(
        socialMedia.connect(user2).createRemix(1, "ipfs://QmRemix1", remixHash)
      )
        .to.emit(socialMedia, "ContentRemixed")
        .withArgs(2, 1, 2, user2.address, user1.address);

      const parentDna = await socialMedia.getContentDNA(1);
      expect(parentDna.remixCount).to.equal(1);

      const remixDna = await socialMedia.getContentDNA(2);
      expect(remixDna.parentDnaId).to.equal(1);
      expect(remixDna.originalCreator).to.equal(user1.address);
      expect(remixDna.currentOwner).to.equal(user2.address);

      const descendants = await socialMedia.getRemixDescendants(1);
      expect(descendants.length).to.equal(1);
      expect(descendants[0]).to.equal(2);
    });
  });

  describe("Automated Royalty Distribution Engine", function () {
    it("should automatically distribute 10% royalty to original creator when remix is tipped", async function () {
      // 1. Create profiles
      await socialMedia.connect(user1).updateProfile("ipfs://QmProfile1");
      await socialMedia.connect(user2).updateProfile("ipfs://QmProfile2");

      // 2. User 1 creates original content with 10% (1000 bps) royalty
      await socialMedia.connect(user1).createOriginalPost("ipfs://QmOrig", ethers.id("Orig"), 1000);

      // 3. User 2 remixes User 1's post (Post ID 2, DNA ID 2)
      await socialMedia.connect(user2).createRemix(1, "ipfs://QmRemix", ethers.id("Remix"));

      // 4. User 3 tips 0.1 ETH on User 2's remix post (Post ID 2)
      const tipAmount = ethers.parseEther("0.1");

      const user1InitialBal = await ethers.provider.getBalance(user1.address);
      const user2InitialBal = await ethers.provider.getBalance(user2.address);

      await expect(
        socialMedia.connect(user3).tipCreator(2, { value: tipAmount })
      )
        .to.emit(socialMedia, "RoyaltyDistributed")
        .withArgs(2, user1.address, user2.address, ethers.parseEther("0.01"), ethers.parseEther("0.09"));

      const user1FinalBal = await ethers.provider.getBalance(user1.address);
      const user2FinalBal = await ethers.provider.getBalance(user2.address);

      // User 1 receives 10% (0.01 ETH)
      expect(user1FinalBal - user1InitialBal).to.equal(ethers.parseEther("0.01"));
      // User 2 receives 90% (0.09 ETH)
      expect(user2FinalBal - user2InitialBal).to.equal(ethers.parseEther("0.09"));
    });
  });

  describe("Profiles & Creator Impact Score", function () {
    it("should calculate creator impact score transparently", async function () {
      await socialMedia.connect(user1).updateProfile("ipfs://QmP1");
      await socialMedia.connect(user1).createOriginalPost("ipfs://Post1", ethers.id("1"), 1000);

      const metrics = await socialMedia.getCreatorMetrics(user1.address);
      expect(metrics.originalCount).to.equal(1);
      expect(metrics.remixCount).to.equal(0);
      expect(metrics.impactScore).to.equal(15); // 1 original * 15 = 15
    });
  });
});
