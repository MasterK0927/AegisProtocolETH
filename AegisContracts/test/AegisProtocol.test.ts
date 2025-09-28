import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { AgentNFT, RentalContract } from "../typechain-types";

describe("Aegis Protocol", function () {
  // Fixture to deploy contracts
  async function deployAegisProtocolFixture() {
    const [owner, creator, renter, otherUser] = await ethers.getSigners();

    // Deploy AgentNFT
    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const agentNFT = await AgentNFT.deploy();

    // Deploy RentalContract
    const RentalContract = await ethers.getContractFactory("RentalContract");
    const rentalContract = await RentalContract.deploy(
      await agentNFT.getAddress()
    );

    return {
      agentNFT,
      rentalContract,
      owner,
      creator,
      renter,
      otherUser,
    };
  }

  describe("AgentNFT", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { agentNFT } = await loadFixture(deployAegisProtocolFixture);
      expect(await agentNFT.name()).to.equal("Aegis Agent");
      expect(await agentNFT.symbol()).to.equal("AEGIS");
    });

    it("Should mint an agent NFT to creator", async function () {
      const { agentNFT, creator } = await loadFixture(
        deployAegisProtocolFixture
      );

      const tokenURI = "ipfs://QmTest123";
      await expect(agentNFT.connect(creator).mintAgent(tokenURI))
        .to.emit(agentNFT, "AgentMinted")
        .withArgs(0, creator.address, tokenURI);

      expect(await agentNFT.ownerOf(0)).to.equal(creator.address);
      expect(await agentNFT.tokenURI(0)).to.equal(tokenURI);
    });

    it("Should mint to the caller's address", async function () {
      const { agentNFT, creator, renter } = await loadFixture(
        deployAegisProtocolFixture
      );

      await agentNFT.connect(creator).mintAgent("ipfs://creator-agent");
      expect(await agentNFT.ownerOf(0)).to.equal(creator.address);

      await agentNFT.connect(renter).mintAgent("ipfs://renter-agent");
      expect(await agentNFT.ownerOf(1)).to.equal(renter.address);
    });

    it("Should return correct token ID after minting", async function () {
      const { agentNFT, creator } = await loadFixture(
        deployAegisProtocolFixture
      );

      await agentNFT.connect(creator).mintAgent("ipfs://test1");
      await agentNFT.connect(creator).mintAgent("ipfs://test2");

      expect(await agentNFT.ownerOf(0)).to.equal(creator.address);
      expect(await agentNFT.ownerOf(1)).to.equal(creator.address);
    });
  });

  describe("RentalContract", function () {
    let tokenId: number;

    beforeEach(async function () {
      tokenId = 0;
    });

    it("Should set rental price by NFT owner", async function () {
      const { agentNFT, rentalContract, creator } = await loadFixture(
        deployAegisProtocolFixture
      );

      // Mint an NFT to creator
      await agentNFT.connect(creator).mintAgent("ipfs://test");

      // Set rental price
      const pricePerSecond = ethers.parseEther("0.0001"); // 0.0001 MATIC per second
      await expect(
        rentalContract.connect(creator).setRentalPrice(tokenId, pricePerSecond)
      )
        .to.emit(rentalContract, "RentalPriceSet")
        .withArgs(tokenId, pricePerSecond);

      expect(await rentalContract.rentalPrices(tokenId)).to.equal(
        pricePerSecond
      );
    });

    it("Should not allow non-owner to set rental price", async function () {
      const { agentNFT, rentalContract, creator, renter } = await loadFixture(
        deployAegisProtocolFixture
      );

      await agentNFT.connect(creator).mintAgent("ipfs://test");

      await expect(
        rentalContract
          .connect(renter)
          .setRentalPrice(tokenId, ethers.parseEther("0.0001"))
      ).to.be.revertedWith("Not the owner");
    });

    it("Should allow renting an agent", async function () {
      const { agentNFT, rentalContract, creator, renter } = await loadFixture(
        deployAegisProtocolFixture
      );

      // Setup: Mint NFT and set price
      await agentNFT.connect(creator).mintAgent("ipfs://test");
      const pricePerSecond = ethers.parseEther("0.0001");
      await rentalContract
        .connect(creator)
        .setRentalPrice(tokenId, pricePerSecond);

      // Rent for 1 hour (3600 seconds)
      const duration = 3600;
      const totalPrice = pricePerSecond * BigInt(duration);

      const creatorBalanceBefore = await ethers.provider.getBalance(
        creator.address
      );

      await expect(
        rentalContract
          .connect(renter)
          .rent(tokenId, duration, { value: totalPrice })
      ).to.emit(rentalContract, "RentalStarted");

      // Check rental is active
      expect(await rentalContract.isRentalActive(tokenId, renter.address)).to.be
        .true;

      // Check creator received payment
      const creatorBalanceAfter = await ethers.provider.getBalance(
        creator.address
      );
      expect(creatorBalanceAfter).to.equal(creatorBalanceBefore + totalPrice);
    });

    it("Should not allow renting with insufficient payment", async function () {
      const { agentNFT, rentalContract, creator, renter } = await loadFixture(
        deployAegisProtocolFixture
      );

      await agentNFT.connect(creator).mintAgent("ipfs://test");
      const pricePerSecond = ethers.parseEther("0.0001");
      await rentalContract
        .connect(creator)
        .setRentalPrice(tokenId, pricePerSecond);

      const duration = 3600;
      const insufficientPayment = (pricePerSecond * BigInt(duration)) / 2n; // Half the required amount

      await expect(
        rentalContract
          .connect(renter)
          .rent(tokenId, duration, { value: insufficientPayment })
      ).to.be.revertedWith("Insufficient payment for the rental duration");
    });

    it("Should expire rental after duration", async function () {
      const { agentNFT, rentalContract, creator, renter } = await loadFixture(
        deployAegisProtocolFixture
      );

      await agentNFT.connect(creator).mintAgent("ipfs://test");
      const pricePerSecond = ethers.parseEther("0.0001");
      await rentalContract
        .connect(creator)
        .setRentalPrice(tokenId, pricePerSecond);

      const duration = 100; // 100 seconds
      const totalPrice = pricePerSecond * BigInt(duration);

      await rentalContract
        .connect(renter)
        .rent(tokenId, duration, { value: totalPrice });

      // Check rental is active
      expect(await rentalContract.isRentalActive(tokenId, renter.address)).to.be
        .true;

      // Fast forward time
      await time.increase(duration + 1);

      // Check rental is expired
      expect(await rentalContract.isRentalActive(tokenId, renter.address)).to.be
        .false;
    });

    it("Should not allow renting unpriced agents", async function () {
      const { agentNFT, rentalContract, creator, renter } = await loadFixture(
        deployAegisProtocolFixture
      );

      await agentNFT.connect(creator).mintAgent("ipfs://test");
      // Don't set price

      await expect(
        rentalContract
          .connect(renter)
          .rent(tokenId, 3600, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("This agent is not for rent");
    });
  });

  describe("End-to-End Flow", function () {
    it("Should complete full user journey: mint, rent, purchase credits, and verify active rental", async function () {
      const { agentNFT, rentalContract, creator, renter } = await loadFixture(
        deployAegisProtocolFixture
      );

      // Step 1: Creator gets an agent NFT minted
      const tokenURI = "ipfs://QmAgentData123";
      await agentNFT.connect(creator).mintAgent(tokenURI);
      const tokenId = 0;

      // Step 2: Creator sets rental price
      const rentalPricePerSecond = ethers.parseEther("0.0001");
      await rentalContract
        .connect(creator)
        .setRentalPrice(tokenId, rentalPricePerSecond);

      // Step 3: User rents the agent for 1 hour
      const rentalDuration = 3600; // 1 hour
      const rentalPayment = rentalPricePerSecond * BigInt(rentalDuration);
      await rentalContract
        .connect(renter)
        .rent(tokenId, rentalDuration, { value: rentalPayment });

      // Step 4: Verify rental is active (credits now managed off-chain)
      expect(await rentalContract.isRentalActive(tokenId, renter.address)).to.be
        .true;

      console.log("✅ End-to-end flow completed successfully!");
    });
  });
});
