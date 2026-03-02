// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * CreatorCollection (ERC-721)
 *
 * Individual NFT collection deployed per creator via CreatorCollectionFactory.
 * Mirrors the CreatorToken pattern: factory deploys, deployer wallet owns,
 * backend mints on behalf of creators. Creators never pay gas.
 *
 * Features:
 *   - Per-token IPFS URIs for images and video
 *   - Royalties flow to creator wallet (EIP-2981)
 *   - Supply-capped per collection
 *   - Enumerable for querying owned tokens
 *   - Pausable for emergency stops
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CreatorCollection is
    ERC721,
    ERC721URIStorage,
    ERC721Enumerable,
    ERC721Burnable,
    ERC721Royalty,
    Ownable,
    Pausable,
    ReentrancyGuard
{
    uint256 public constant MAX_BATCH_SIZE = 100;

    address public immutable creator;
    string public tenantId;
    uint256 public maxSupply;
    uint256 private _tokenIdCounter;

    event NFTMinted(uint256 indexed tokenId, address indexed recipient, string tokenUri);
    event MetadataUpdated(uint256 indexed tokenId);

    constructor(
        string memory name_,
        string memory symbol_,
        address creator_,
        string memory tenantId_,
        uint256 maxSupply_,
        uint96 royaltyBps
    ) ERC721(name_, symbol_) {
        require(creator_ != address(0), "Invalid creator");
        require(bytes(tenantId_).length > 0, "Invalid tenantId");
        require(maxSupply_ > 0, "Max supply must be > 0");

        creator = creator_;
        tenantId = tenantId_;
        maxSupply = maxSupply_;

        // Royalties go to the creator
        _setDefaultRoyalty(creator_, royaltyBps);
    }

    // ── Minting (owner = factory/deployer backend) ─────────────────────

    /// Mint an NFT to a recipient with an IPFS metadata URI
    function mint(
        address to,
        string calldata tokenUri
    ) external onlyOwner nonReentrant whenNotPaused returns (uint256) {
        require(_tokenIdCounter < maxSupply, "Max supply reached");

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);

        emit NFTMinted(tokenId, to, tokenUri);
        return tokenId;
    }

    /// Batch mint to multiple recipients
    function batchMint(
        address[] calldata recipients,
        string[] calldata tokenUris
    ) external onlyOwner nonReentrant whenNotPaused returns (uint256[] memory) {
        require(recipients.length == tokenUris.length, "Length mismatch");
        require(recipients.length <= MAX_BATCH_SIZE, "Batch too large");
        require(_tokenIdCounter + recipients.length <= maxSupply, "Exceeds max supply");

        uint256[] memory tokenIds = new uint256[](recipients.length);
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 tokenId = _tokenIdCounter++;
            _safeMint(recipients[i], tokenId);
            _setTokenURI(tokenId, tokenUris[i]);
            tokenIds[i] = tokenId;

            emit NFTMinted(tokenId, recipients[i], tokenUris[i]);
        }
        return tokenIds;
    }

    // ── Dynamic Metadata ───────────────────────────────────────────────

    function updateTokenURI(
        uint256 tokenId,
        string calldata newUri
    ) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        _setTokenURI(tokenId, newUri);
        emit MetadataUpdated(tokenId);
    }

    // ── View Functions ─────────────────────────────────────────────────

    function tokensOfOwner(address owner_) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner_);
        uint256[] memory tokens = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner_, i);
        }
        return tokens;
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function remainingSupply() external view returns (uint256) {
        return maxSupply - _tokenIdCounter;
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ── Required Overrides ─────────────────────────────────────────────

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage, ERC721Royalty)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
