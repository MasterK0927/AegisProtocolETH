// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    event AgentMinted(uint256 indexed tokenId, address indexed creator, string tokenURI);

    constructor() ERC721("Aegis Agent", "AEGIS") Ownable(msg.sender) {}

    function mintAgent(address creator, string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        _safeMint(creator, tokenId);
        _setTokenURI(tokenId, tokenURI);
        emit AgentMinted(tokenId, creator, tokenURI);
        return tokenId;
    }
}