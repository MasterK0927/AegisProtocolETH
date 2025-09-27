// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract X402CreditContract is Ownable {
    // example pricing
    uint256 public immutable pricePerCredit;
    mapping(address => uint256) public creditBalances;
    mapping(bytes32 => bool) public usedNonces;

    event CreditsPurchased(address indexed user, uint256 amount);
    event CreditsSpent(address indexed user, address indexed verifier, uint256 amount);

    constructor(uint256 _pricePerCredit) Ownable(msg.sender) {
        pricePerCredit = _pricePerCredit;
    }

    function purchaseCredits() public payable {
        require(pricePerCredit > 0, "Pricing not set");
        uint256 amount = msg.value / pricePerCredit;
        require(amount > 0, "Payment too low to purchase any credits");
        creditBalances[msg.sender] += amount;
        emit CreditsPurchased(msg.sender, amount);
    }

    function spendCredits(address user, uint256 amount, bytes32 nonce) public onlyOwner {
        require(!usedNonces[nonce], "X402: Nonce already used");
        require(creditBalances[user] >= amount, "X402: Insufficient credits");
        usedNonces[nonce] = true;
        creditBalances[user] -= amount;
        emit CreditsSpent(user, msg.sender, amount);
    }

    function withdraw() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}