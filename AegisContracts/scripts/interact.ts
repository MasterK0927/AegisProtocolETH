import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Helper function to load deployment info
function loadDeployment(networkName: string) {
  const deploymentPath = path.join(
    __dirname,
    `../deployments/${networkName}.json`
  );
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `No deployment found for network: ${networkName}. Please deploy first.`
    );
  }
  return JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
}

// Mint a new Agent NFT
export async function mintAgent(tokenURI: string, creatorHint?: string) {
  const signers = await ethers.getSigners();
  let signer = signers[0];

  if (creatorHint) {
    if (creatorHint.startsWith("0x") && creatorHint.length === 42) {
      signer = await ethers.getSigner(creatorHint);
    } else {
      const index = Number.parseInt(creatorHint, 10);
      if (!Number.isNaN(index) && signers[index]) {
        signer = signers[index];
      }
    }
  }

  const network = await ethers.provider.getNetwork();
  const deployment = loadDeployment(`${network.name}-${network.chainId}`);

  const agentNFT = await ethers.getContractAt(
    "AgentNFT",
    deployment.contracts.AgentNFT,
    signer
  );

  console.log(`Minting Agent NFT as ${signer.address}...`);
  const tx = await agentNFT.mintAgent(tokenURI);
  const receipt = await tx.wait();

  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = agentNFT.interface.parseLog(log);
      if (parsed?.name === "AgentMinted") {
        const tokenId = parsed.args[0];
        console.log(`✅ Agent NFT minted! Token ID: ${tokenId}`);
        return tokenId;
      }
    } catch {
      // ignore
    }
  }
}

// Set rental price for an agent
export async function setRentalPrice(tokenId: number, pricePerSecond: string) {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const deployment = loadDeployment(`${network.name}-${network.chainId}`);

  const rentalContract = await ethers.getContractAt(
    "RentalContract",
    deployment.contracts.RentalContract
  );

  const price = ethers.parseEther(pricePerSecond);
  console.log(
    `Setting rental price for Token ${tokenId}: ${pricePerSecond} MATIC/second...`
  );

  const tx = await rentalContract.setRentalPrice(tokenId, price);
  await tx.wait();

  console.log(`✅ Rental price set!`);
  console.log(`   Hourly rate: ${Number(pricePerSecond) * 3600} MATIC`);
  console.log(`   Daily rate: ${Number(pricePerSecond) * 86400} MATIC`);
}

// Rent an agent
export async function rentAgent(tokenId: number, durationInSeconds: number) {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const deployment = loadDeployment(`${network.name}-${network.chainId}`);

  const rentalContract = await ethers.getContractAt(
    "RentalContract",
    deployment.contracts.RentalContract
  );

  // Get rental price
  const pricePerSecond = await rentalContract.rentalPrices(tokenId);
  const totalPrice = pricePerSecond * BigInt(durationInSeconds);

  console.log(`Renting Agent ${tokenId} for ${durationInSeconds} seconds...`);
  console.log(`Total cost: ${ethers.formatEther(totalPrice)} MATIC`);

  const tx = await rentalContract.rent(tokenId, durationInSeconds, {
    value: totalPrice,
  });
  await tx.wait();

  const expiresAt = (await rentalContract.activeRentals(tokenId)).expiresAt;
  console.log(`✅ Agent rented successfully!`);
  console.log(
    `   Expires at: ${new Date(Number(expiresAt) * 1000).toISOString()}`
  );
}

// Purchase credits
export async function purchaseCredits(amountInMatic: string) {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const deployment = loadDeployment(`${network.name}-${network.chainId}`);

  const x402Contract = await ethers.getContractAt(
    "X402CreditContract",
    deployment.contracts.X402CreditContract
  );

  const payment = ethers.parseEther(amountInMatic);
  const pricePerCredit = await x402Contract.pricePerCredit();
  const creditsToReceive = payment / pricePerCredit;

  console.log(`Purchasing credits for ${amountInMatic} MATIC...`);
  console.log(`You will receive: ${creditsToReceive} credits`);

  const tx = await x402Contract.purchaseCredits({ value: payment });
  await tx.wait();

  const balance = await x402Contract.creditBalances(signer.address);
  console.log(`✅ Credits purchased!`);
  console.log(`   Your balance: ${balance} credits`);
}

// Check rental status
export async function checkRentalStatus(tokenId: number, userAddress?: string) {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const deployment = loadDeployment(`${network.name}-${network.chainId}`);

  const rentalContract = await ethers.getContractAt(
    "RentalContract",
    deployment.contracts.RentalContract
  );

  const address = userAddress || signer.address;
  const isActive = await rentalContract.isRentalActive(tokenId, address);
  const rental = await rentalContract.activeRentals(tokenId);

  console.log(`\n🔍 Rental Status for Token ${tokenId}:`);
  console.log(`   User: ${address}`);
  console.log(`   Active: ${isActive ? "✅ Yes" : "❌ No"}`);

  if (rental.renter !== ethers.ZeroAddress) {
    console.log(`   Current Renter: ${rental.renter}`);
    console.log(
      `   Expires: ${new Date(Number(rental.expiresAt) * 1000).toISOString()}`
    );
  }
}

// Check credit balance
export async function checkCreditBalance(userAddress?: string) {
  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const deployment = loadDeployment(`${network.name}-${network.chainId}`);

  const x402Contract = await ethers.getContractAt(
    "X402CreditContract",
    deployment.contracts.X402CreditContract
  );

  const address = userAddress || signer.address;
  const balance = await x402Contract.creditBalances(address);
  const pricePerCredit = await x402Contract.pricePerCredit();

  console.log(`\n💳 Credit Balance:`);
  console.log(`   User: ${address}`);
  console.log(`   Balance: ${balance} credits`);
  console.log(
    `   Value: ${ethers.formatEther(balance * pricePerCredit)} MATIC`
  );
}

// Main interactive CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Aegis Protocol Interaction Scripts
===================================

Usage: npx hardhat run scripts/interact.ts --network <network> -- <command> [args]

Commands:
  mint <token_uri> [account]             - Mint a new Agent NFT (optionally specify signer index or address)
  set-price <token_id> <price_per_sec>   - Set rental price (in MATIC/second)
  rent <token_id> <duration_seconds>     - Rent an agent
  purchase-credits <amount_matic>        - Purchase X402 credits
  check-rental <token_id> [user_address] - Check rental status
  check-credits [user_address]           - Check credit balance

Examples:
  npx hardhat run scripts/interact.ts --network localhost -- mint 0x123... ipfs://Qm...
  npx hardhat run scripts/interact.ts --network localhost -- set-price 0 0.0001
  npx hardhat run scripts/interact.ts --network localhost -- rent 0 3600
  npx hardhat run scripts/interact.ts --network localhost -- purchase-credits 1.0
    `);
    return;
  }

  try {
    switch (command) {
      case "mint":
        await mintAgent(args[1], args[2]);
        break;
      case "set-price":
        await setRentalPrice(parseInt(args[1]), args[2]);
        break;
      case "rent":
        await rentAgent(parseInt(args[1]), parseInt(args[2]));
        break;
      case "purchase-credits":
        await purchaseCredits(args[1]);
        break;
      case "check-rental":
        await checkRentalStatus(parseInt(args[1]), args[2]);
        break;
      case "check-credits":
        await checkCreditBalance(args[1]);
        break;
      default:
        console.error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
