import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AgentNFT, RentalContract, X402CreditContract } from "../typechain-types";

describe("Aegis Protocol", function () {
  // Fixture to deploy contracts
  async function deployAegisProtocolFixture() {
    const [owner, creator, renter, otherUser] = await ethers.getSigners();

    // Deploy AgentNFT
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const agentNFT = await AgentNFT.deploy();

    // Deploy RentalContract
    const RentalContract = await ethers.getContractFactory("RentalContract");
    const rentalContract = await RentalContract.deploy(await agentNFT.getAddress());

    // Deploy X402CreditContract with price of 0.001 MATIC per credit
    const pricePerCredit = ethers.parseEther("0.001");
    const X402CreditContract = await ethers.getContractFactory("X402CreditContract");
    const x402CreditContract = await X402CreditContract.deploy(pricePerCredit);

    return { 
      agentNFT, 
      rentalContract, 
      x402CreditContract, 
      owner, 
      creator, 
      renter, 
      otherUser,
      pricePerCredit 
    };
  }

  describe("AgentNFT", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { agentNFT } = await loadFixture(deployAegisProtocolFixture);
      expect(await agentNFT.name()).to.equal("Aegis Agent");
      expect(await agentNFT.symbol()).to.equal("AEGIS");
    });

    it("Should mint an agent NFT to creator", async function () {
      const { agentNFT, owner, creator } = await loadFixture(deployAegisProtocolFixture);
      
      const tokenURI = "ipfs://QmTest123";
      await expect(agentNFT.connect(owner).mintAgent(creator.address, tokenURI))
        .to.emit(agentNFT, "AgentMinted")
        .withArgs(0, creator.address, tokenURI);
      
      expect(await agentNFT.ownerOf(0)).to.equal(creator.address);
      expect(await agentNFT.tokenURI(0)).to.equal(tokenURI);
    });

    it("Should only allow owner to mint", async function () {
      const { agentNFT, creator } = await loadFixture(deployAegisProtocolFixture);
      
      await expect(
        agentNFT.connect(creator).mintAgent(creator.address, "ipfs://test")
      ).to.be.revertedWithCustomError(agentNFT, "OwnableUnauthorizedAccount");
    });

    it("Should return correct token ID after minting", async function () {
      const { agentNFT, owner, creator } = await loadFixture(deployAegisProtocolFixture);
      
      const tx = await agentNFT.connect(owner).mintAgent(creator.address, "ipfs://test1");
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => log.fragment?.name === "AgentMinted");
      expect(event?.args[0]).to.equal(0); // First token ID should be 0
      
      const tx2 = await agentNFT.connect(owner).mintAgent(creator.address, "ipfs://test2");
      const receipt2 = await tx2.wait();
      const event2 = receipt2?.logs.find((log: any) => log.fragment?.name === "AgentMinted");
      expect(event2?.args[0]).to.equal(1); // Second token ID should be 1
    });
  });

  describe("RentalContract", function () {
    let tokenId: number;

    beforeEach(async function () {
      tokenId = 0;
    });

    it("Should set rental price by NFT owner", async function () {
      const { agentNFT, rentalContract, owner, creator } = await loadFixture(deployAegisProtocolFixture);
      
      // Mint an NFT to creator
      await agentNFT.connect(owner).mintAgent(creator.address, "ipfs://test");
      
      // Set rental price
      const pricePerSecond = ethers.parseEther("0.0001"); // 0.0001 MATIC per second
      await expect(rentalContract.connect(creator).setRentalPrice(tokenId, pricePerSecond))
        .to.emit(rentalContract, "RentalPriceSet")
        .withArgs(tokenId, pricePerSecond);
      
      expect(await rentalContract.rentalPrices(tokenId)).to.equal(pricePerSecond);
    });

    it("Should not allow non-owner to set rental price", async function () {
      const { agentNFT, rentalContract, owner, creator, renter } = await loadFixture(deployAegisProtocolFixture);
      
      await agentNFT.connect(owner).mintAgent(creator.address, "ipfs://test");
      
      await expect(
        rentalContract.connect(renter).setRentalPrice(tokenId, ethers.parseEther("0.0001"))
      ).to.be.revertedWith("Not the owner");
    });

    it("Should allow renting an agent", async function () {
      const { agentNFT, rentalContract, owner, creator, renter } = await loadFixture(deployAegisProtocolFixture);
      
      // Setup: Mint NFT and set price
      await agentNFT.connect(owner).mintAgent(creator.address, "ipfs://test");
      const pricePerSecond = ethers.parseEther("0.0001");
      await rentalContract.connect(creator).setRentalPrice(tokenId, pricePerSecond);
      
      // Rent for 1 hour (3600 seconds)
      const duration = 3600;
      const totalPrice = pricePerSecond * BigInt(duration);
      
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      
      await expect(rentalContract.connect(renter).rent(tokenId, duration, { value: totalPrice }))
        .to.emit(rentalContract, "RentalStarted");
      
      // Check rental is active
      expect(await rentalContract.isRentalActive(tokenId, renter.address)).to.be.true;
      
      // Check creator received payment
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      expect(creatorBalanceAfter).to.equal(creatorBalanceBefore + totalPrice);
    });

    it("Should not allow renting with insufficient payment", async function () {
      const { agentNFT, rentalContract, owner, creator, renter } = await loadFixture(deployAegisProtocolFixture);
      
      await agentNFT.connect(owner).mintAgent(creator.address, "ipfs://test");
      const pricePerSecond = ethers.parseEther("0.0001");
      await rentalContract.connect(creator).setRentalPrice(tokenId, pricePerSecond);
      
      const duration = 3600;
      const insufficientPayment = pricePerSecond * BigInt(duration) / 2n; // Half the required amount
      
      await expect(
        rentalContract.connect(renter).rent(tokenId, duration, { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment for the rental duration");
    });

    it("Should expire rental after duration", async function () {
      const { agentNFT, rentalContract, owner, creator, renter } = await loadFixture(deployAegisProtocolFixture);
      
      await agentNFT.connect(owner).mintAgent(creator.address, "ipfs://test");
      const pricePerSecond = ethers.parseEther("0.0001");
      await rentalContract.connect(creator).setRentalPrice(tokenId, pricePerSecond);
      
      const duration = 100; // 100 seconds
      const totalPrice = pricePerSecond * BigInt(duration);
      
      await rentalContract.connect(renter).rent(tokenId, duration, { value: totalPrice });
      
      // Check rental is active
      expect(await rentalContract.isRentalActive(tokenId, renter.address)).to.be.true;
      
      // Fast forward time
      await time.increase(duration + 1);
      
      // Check rental is expired
      expect(await rentalContract.isRentalActive(tokenId, renter.address)).to.be.false;
    });

    it("Should not allow renting unpriced agents", async function () {
      const { agentNFT, rentalContract, owner, creator, renter } = await loadFixture(deployAegisProtocolFixture);
      
      await agentNFT.connect(owner).mintAgent(creator.address, "ipfs://test");
      // Don't set price
      
      await expect(
        rentalContract.connect(renter).rent(tokenId, 3600, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("This agent is not for rent");
    });
  });

  describe("X402CreditContract", function () {
    it("Should deploy with correct price per credit", async function () {
      const { x402CreditContract, pricePerCredit } = await loadFixture(deployAegisProtocolFixture);
      expect(await x402CreditContract.pricePerCredit()).to.equal(pricePerCredit);
    });

    it("Should allow purchasing credits", async function () {
      const { x402CreditContract, renter, pricePerCredit } = await loadFixture(deployAegisProtocolFixture);
      
      const creditsToBuy = 100n;
      const payment = pricePerCredit * creditsToBuy;
      
      await expect(x402CreditContract.connect(renter).purchaseCredits({ value: payment }))
        .to.emit(x402CreditContract, "CreditsPurchased")
        .withArgs(renter.address, creditsToBuy);
      
      expect(await x402CreditContract.creditBalances(renter.address)).to.equal(creditsToBuy);
    });

    it("Should accumulate credits on multiple purchases", async function () {
      const { x402CreditContract, renter, pricePerCredit } = await loadFixture(deployAegisProtocolFixture);
      
      const firstPurchase = 50n;
      const secondPurchase = 30n;
      
      await x402CreditContract.connect(renter).purchaseCredits({ value: pricePerCredit * firstPurchase });
      await x402CreditContract.connect(renter).purchaseCredits({ value: pricePerCredit * secondPurchase });
      
      expect(await x402CreditContract.creditBalances(renter.address)).to.equal(firstPurchase + secondPurchase);
    });

    it("Should not purchase credits with insufficient payment", async function () {
      const { x402CreditContract, renter } = await loadFixture(deployAegisProtocolFixture);
      
      const tooSmallPayment = ethers.parseEther("0.0001"); // Less than one credit
      
      await expect(
        x402CreditContract.connect(renter).purchaseCredits({ value: tooSmallPayment })
      ).to.be.revertedWith("Payment too low to purchase any credits");
    });

    it("Should allow owner to spend user credits", async function () {
      const { x402CreditContract, owner, renter, pricePerCredit } = await loadFixture(deployAegisProtocolFixture);
      
      // User buys credits
      const creditsToBuy = 100n;
      await x402CreditContract.connect(renter).purchaseCredits({ value: pricePerCredit * creditsToBuy });
      
      // Owner spends credits
      const creditsToSpend = 25n;
      const nonce = ethers.randomBytes(32);
      
      await expect(x402CreditContract.connect(owner).spendCredits(renter.address, creditsToSpend, nonce))
        .to.emit(x402CreditContract, "CreditsSpent")
        .withArgs(renter.address, owner.address, creditsToSpend);
      
      expect(await x402CreditContract.creditBalances(renter.address)).to.equal(creditsToBuy - creditsToSpend);
      expect(await x402CreditContract.usedNonces(nonce)).to.be.true;
    });

    it("Should prevent replay attacks with nonces", async function () {
      const { x402CreditContract, owner, renter, pricePerCredit } = await loadFixture(deployAegisProtocolFixture);
      
      await x402CreditContract.connect(renter).purchaseCredits({ value: pricePerCredit * 100n });
      
      const nonce = ethers.randomBytes(32);
      await x402CreditContract.connect(owner).spendCredits(renter.address, 10n, nonce);
      
      // Try to use the same nonce again
      await expect(
        x402CreditContract.connect(owner).spendCredits(renter.address, 10n, nonce)
      ).to.be.revertedWith("X402: Nonce already used");
    });

    it("Should not allow non-owner to spend credits", async function () {
      const { x402CreditContract, renter, otherUser, pricePerCredit } = await loadFixture(deployAegisProtocolFixture);
      
      await x402CreditContract.connect(renter).purchaseCredits({ value: pricePerCredit * 100n });
      
      await expect(
        x402CreditContract.connect(otherUser).spendCredits(renter.address, 10n, ethers.randomBytes(32))
      ).to.be.revertedWithCustomError(x402CreditContract, "OwnableUnauthorizedAccount");
    });

    it("Should not spend more credits than available", async function () {
      const { x402CreditContract, owner, renter, pricePerCredit } = await loadFixture(deployAegisProtocolFixture);
      
      await x402CreditContract.connect(renter).purchaseCredits({ value: pricePerCredit * 50n });
      
      await expect(
        x402CreditContract.connect(owner).spendCredits(renter.address, 100n, ethers.randomBytes(32))
      ).to.be.revertedWith("X402: Insufficient credits");
    });

    it("Should allow owner to withdraw funds", async function () {
      const { x402CreditContract, owner, renter, pricePerCredit } = await loadFixture(deployAegisProtocolFixture);
      
      const payment = pricePerCredit * 100n;
      await x402CreditContract.connect(renter).purchaseCredits({ value: payment });
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      const tx = await x402CreditContract.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + payment - gasUsed);
    });
  });

  describe("End-to-End Flow", function () {
    it("Should complete full user journey: mint, rent, purchase credits, and verify active rental", async function () {
      const { agentNFT, rentalContract, x402CreditContract, owner, creator, renter, pricePerCredit } = 
        await loadFixture(deployAegisProtocolFixture);
      
      // Step 1: Creator gets an agent NFT minted
      const tokenURI = "ipfs://QmAgentData123";
      await agentNFT.connect(owner).mintAgent(creator.address, tokenURI);
      const tokenId = 0;
      
      // Step 2: Creator sets rental price
      const rentalPricePerSecond = ethers.parseEther("0.0001");
      await rentalContract.connect(creator).setRentalPrice(tokenId, rentalPricePerSecond);
      
      // Step 3: User rents the agent for 1 hour
      const rentalDuration = 3600; // 1 hour
      const rentalPayment = rentalPricePerSecond * BigInt(rentalDuration);
      await rentalContract.connect(renter).rent(tokenId, rentalDuration, { value: rentalPayment });
      
      // Step 4: User purchases credits for inference
      const creditsToBuy = 1000n;
      const creditPayment = pricePerCredit * creditsToBuy;
      await x402CreditContract.connect(renter).purchaseCredits({ value: creditPayment });
      
      // Step 5: Verify rental is active and user has credits
      expect(await rentalContract.isRentalActive(tokenId, renter.address)).to.be.true;
      expect(await x402CreditContract.creditBalances(renter.address)).to.equal(creditsToBuy);
      
      // Step 6: Simulate credit spending by owner (verifier)
      const creditsPerChat = 100n;
      const chatNonce = ethers.randomBytes(32);
      await x402CreditContract.connect(owner).spendCredits(renter.address, creditsPerChat, chatNonce);
      
      // Verify credits were deducted
      expect(await x402CreditContract.creditBalances(renter.address)).to.equal(creditsToBuy - creditsPerChat);
      
      // Verify rental is still active
      expect(await rentalContract.isRentalActive(tokenId, renter.address)).to.be.true;
      
      console.log("✅ End-to-end flow completed successfully!");
    });
  });
});
