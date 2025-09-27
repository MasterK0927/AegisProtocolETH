// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentNFT.sol";

contract RentalContract {
    struct Rental {
        address renter;
        uint256 expiresAt;
    }

    AgentNFT public immutable agentNFT;
    mapping(uint256 => Rental) public activeRentals;
    mapping(uint256 => uint256) public rentalPrices;
    
    event RentalStarted(uint256 indexed tokenId, address indexed renter, uint256 expiresAt, uint256 price);
    event RentalPriceSet(uint256 indexed tokenId, uint256 pricePerSecond);

    constructor(address _agentNFTAddress) {
        agentNFT = AgentNFT(_agentNFTAddress);
    }

    function setRentalPrice(uint256 tokenId, uint256 pricePerSecond) public {
        require(agentNFT.ownerOf(tokenId) == msg.sender, "Not the owner");
        rentalPrices[tokenId] = pricePerSecond;
        emit RentalPriceSet(tokenId, pricePerSecond);
    }

    function rent(uint256 tokenId, uint256 durationInSeconds) public payable {
        uint256 price = rentalPrices[tokenId] * durationInSeconds;
        require(price > 0, "This agent is not for rent");
        require(msg.value >= price, "Insufficient payment for the rental duration");

        activeRentals[tokenId] = Rental({
            renter: msg.sender,
            expiresAt: block.timestamp + durationInSeconds
        });

        address creator = agentNFT.ownerOf(tokenId);
        (bool success, ) = payable(creator).call{value: msg.value}("");
        require(success, "Failed to send payment to the creator");
        
        emit RentalStarted(tokenId, msg.sender, activeRentals[tokenId].expiresAt, msg.value);

    }

    function isRentalActive(uint256 tokenId, address user) public view returns (bool) {
        Rental memory rental = activeRentals[tokenId];
        return rental.renter == user && block.timestamp < rental.expiresAt;
    }
}