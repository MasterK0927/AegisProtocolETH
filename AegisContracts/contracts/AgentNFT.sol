// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract AgentNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _nextTokenId;

    constructor() ERC721("Aegis Agent", "AEGIS") Ownable(msg.sender) {}

    function mintAgent(address creator, string memory tokenURI) public onlyOwner {
        uint256 tokenId = _nextTokenId.current();
        _nextTokenId.increment();
        _safeMint(creator, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }
}