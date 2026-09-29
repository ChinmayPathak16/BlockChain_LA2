import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.error("❌ No deployer account configured!");
    console.error("Please set DEPLOYER_PRIVATE_KEY in your .env file or run:");
    console.error("npx ts-node scripts/createBurner.ts");
    process.exitCode = 1;
    return;
  }

  const [deployer] = signers;
  console.log(`====================================================`);
  console.log(`Network:          ${network.name}`);
  console.log(`Deployer Address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`====================================================`);

  if (balance === 0n && network.name !== "hardhat" && network.name !== "localhost") {
    console.error(`\n❌ Insufficient balance to deploy to ${network.name}.`);
    console.error(`Please fund your deployer wallet (${deployer.address}) with testnet ETH.`);
    console.error(`Faucets:`);
    console.error(`- Google Cloud Web3 Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia`);
    console.error(`- QuickNode Faucet:         https://faucet.quicknode.com/ethereum/sepolia`);
    console.error(`- Sepolia PoW Faucet:       https://sepolia-faucet.pk910.de`);
    console.error(`- Alchemy Faucet:           https://www.alchemy.com/faucets/ethereum-sepolia\n`);
    process.exitCode = 1;
    return;
  }

  console.log("Deploying PraiseBoard smart contract...");
  const PraiseBoardFactory = await ethers.getContractFactory("PraiseBoard");
  const praiseBoard = await PraiseBoardFactory.deploy();
  await praiseBoard.waitForDeployment();

  const deployedAddress = await praiseBoard.getAddress();
  const deploymentTx = praiseBoard.deploymentTransaction();
  const currentBlock = await ethers.provider.getBlockNumber();

  console.log("----------------------------------------------------");
  console.log("🎉 PraiseBoard deployed successfully!");
  console.log("Contract Address: ", deployedAddress);
  console.log("Transaction Hash: ", deploymentTx?.hash);
  console.log("Deployed at Block:", currentBlock);
  console.log("----------------------------------------------------");

  // Automatically update or create .env file
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  } else {
    const envExamplePath = path.join(__dirname, "..", ".env.example");
    if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, "utf-8");
    }
  }

  // Replace or append NEXT_PUBLIC_PRAISE_BOARD_ADDRESS
  if (envContent.includes("NEXT_PUBLIC_PRAISE_BOARD_ADDRESS=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_PRAISE_BOARD_ADDRESS=.*/g,
      `NEXT_PUBLIC_PRAISE_BOARD_ADDRESS=${deployedAddress}`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_PRAISE_BOARD_ADDRESS=${deployedAddress}`;
  }

  // Replace or append NEXT_PUBLIC_DEPLOYMENT_BLOCK
  if (envContent.includes("NEXT_PUBLIC_DEPLOYMENT_BLOCK=")) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_DEPLOYMENT_BLOCK=.*/g,
      `NEXT_PUBLIC_DEPLOYMENT_BLOCK=${currentBlock}`
    );
  } else {
    envContent += `\nNEXT_PUBLIC_DEPLOYMENT_BLOCK=${currentBlock}`;
  }

  fs.writeFileSync(envPath, envContent.trim() + "\n");
  console.log(`Updated .env with:`);
  console.log(`NEXT_PUBLIC_PRAISE_BOARD_ADDRESS=${deployedAddress}`);
  console.log(`NEXT_PUBLIC_DEPLOYMENT_BLOCK=${currentBlock}`);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
