// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract X402CreditContract {
    // example pricing
    uint256 public pricePerCredit = 0.0001 ether;
    mapping(address => uint256) public creditBalances;
    mapping(bytes32 => bool) public usedNonces;

    event CreditsPurchased(address indexed user, uint256 amount);
    event CreditsSpent(address indexed user, uint256 amount);

    function purchaseCredits() public payable {
        uint256 amount = msg.value / pricePerCredit;
        require(amount > 0, "Payment too low");
        creditBalances[msg.sender] += amount;
        emit CreditsPurchased(msg.sender, amount);
    }

    function spendCredits(address user, uint256 amount, bytes32 nonce) public {
        require(!usedNonces[nonce], "Nonce already used");
        require(creditBalances[user] >= amount, "Insufficient credits");
        creditBalances[user] -= amount;
        usedNonces[nonce] = true;
        emit CreditsSpent(user, amount);
    }

    function getCreditBalance(address user) public view returns (uint256) {
        return creditBalances[user];
    }
}