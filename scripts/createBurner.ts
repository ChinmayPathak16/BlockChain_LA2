import { ethers } from "ethers";

async function main() {
  const wallet = ethers.Wallet.createRandom();
  console.log("====================================================");
  console.log("       ✨ Generated Sepolia Burner Wallet ✨       ");
  console.log("====================================================");
  console.log("Address:     ", wallet.address);
  console.log("Private Key: ", wallet.privateKey);
  console.log("====================================================");
  console.log("\nNext Steps to Deploy to Ethereum Sepolia:");
  console.log("1. Fund this wallet using a Sepolia Faucet:");
  console.log("   - Google Cloud Web3 Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
  console.log("   - QuickNode Faucet:         https://faucet.quicknode.com/ethereum/sepolia");
  console.log("   - Sepolia PoW Faucet:       https://sepolia-faucet.pk910.de");
  console.log("   - Alchemy Faucet:           https://www.alchemy.com/faucets/ethereum-sepolia");
  console.log("\n2. Add the private key to your .env file:");
  console.log(`   DEPLOYER_PRIVATE_KEY=${wallet.privateKey}`);
  console.log("\n3. Run the deployment script:");
  console.log("   npx hardhat run scripts/deploy.ts --network sepolia\n");
}

main().catch(console.error);
