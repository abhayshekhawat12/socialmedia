import hre from "hardhat";
const { ethers } = hre;
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("----------------------------------------------------");
  console.log("🚀 Deploying Decentralized Social Contracts...");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log(`📍 Deploying from account: ${deployer.address}`);
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // 1. Deploy ProofOfCreation
  const ProofOfCreationFactory = await ethers.getContractFactory("ProofOfCreation");
  const proofOfCreation = await ProofOfCreationFactory.deploy();
  await proofOfCreation.waitForDeployment();
  const proofAddress = await proofOfCreation.getAddress();
  console.log(`✅ ProofOfCreation deployed to: ${proofAddress}`);

  // 2. Deploy SocialNFT
  const SocialNFTFactory = await ethers.getContractFactory("SocialNFT");
  const socialNFT = await SocialNFTFactory.deploy();
  await socialNFT.waitForDeployment();
  const nftAddress = await socialNFT.getAddress();
  console.log(`✅ SocialNFT deployed to: ${nftAddress}`);

  // 3. Deploy SocialMedia
  const SocialMediaFactory = await ethers.getContractFactory("SocialMedia");
  const socialMedia = await SocialMediaFactory.deploy();
  await socialMedia.waitForDeployment();
  const socialAddress = await socialMedia.getAddress();
  console.log(`✅ SocialMedia deployed to: ${socialAddress}`);

  // Read ABIs
  const getAbi = (contractName: string) => {
    const p = path.join(process.cwd(), `artifacts/contracts/${contractName}.sol/${contractName}.json`);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8")).abi;
    }
    return [];
  };

  const proofAbi = getAbi("ProofOfCreation");
  const nftAbi = getAbi("SocialNFT");
  const socialAbi = getAbi("SocialMedia");

  const libDir = path.join(process.cwd(), "lib");
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  const configPath = path.join(libDir, "contract-config.json");
  const configData = {
    address: proofAddress, // Primary contract
    proofOfCreationAddress: proofAddress,
    socialNFTAddress: nftAddress,
    socialMediaAddress: socialAddress,
    chainId: network.chainId.toString(),
    deployedAt: new Date().toISOString(),
    abi: proofAbi,
    proofOfCreationAbi: proofAbi,
    socialNFTAbi: nftAbi,
    socialMediaAbi: socialAbi
  };

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  console.log(`📁 Contract configuration & ABIs written to: ${configPath}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
