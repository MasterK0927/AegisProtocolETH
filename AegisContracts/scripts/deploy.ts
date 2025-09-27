import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment of Aegis Protocol contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");

  console.log("\nDeploying AgentNFT contract...");
  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy();
  await agentNFT.waitForDeployment();
  const agentNFTAddress = await agentNFT.getAddress();
  console.log("AgentNFT deployed to:", agentNFTAddress);

  console.log("\nDeploying RentalContract...");
  const RentalContract = await ethers.getContractFactory("RentalContract");
  const rentalContract = await RentalContract.deploy(agentNFTAddress);
  await rentalContract.waitForDeployment();
  const rentalContractAddress = await rentalContract.getAddress();
  console.log("RentalContract deployed to:", rentalContractAddress);

  console.log("\nDeploying X402CreditContract...");
  const pricePerCredit = ethers.parseEther("0.001");
  const X402CreditContract = await ethers.getContractFactory("X402CreditContract");
  const x402CreditContract = await X402CreditContract.deploy(pricePerCredit);
  await x402CreditContract.waitForDeployment();
  const x402Address = await x402CreditContract.getAddress();
  console.log("X402CreditContract deployed to:", x402Address);
  console.log("Price per credit:", ethers.formatEther(pricePerCredit), "MATIC");

  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log("\nContract Addresses:");
  console.log("AgentNFT:           ", agentNFTAddress);
  console.log("RentalContract:     ", rentalContractAddress);
  console.log("X402CreditContract: ", x402Address);
  console.log("\nNetwork:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  
  const deployment = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    contracts: {
      AgentNFT: agentNFTAddress,
      RentalContract: rentalContractAddress,
      X402CreditContract: x402Address,
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    pricePerCredit: ethers.formatEther(pricePerCredit) + " MATIC"
  };

  const fs = await import("fs");
  const deploymentPath = `./deployments/${deployment.network}-${deployment.chainId}.json`;
  
  if (!fs.existsSync("./deployments")) {
    fs.mkdirSync("./deployments");
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("\nDeployment info saved to:", deploymentPath);
  
  console.log("\nVerification commands:");
  console.log("npx hardhat verify --network <network> " + agentNFTAddress);
  console.log("npx hardhat verify --network <network> " + rentalContractAddress + " " + agentNFTAddress);
  console.log("npx hardhat verify --network <network> " + x402Address + " " + pricePerCredit.toString());
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
