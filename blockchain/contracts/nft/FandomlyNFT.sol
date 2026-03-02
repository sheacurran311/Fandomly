// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * FandomlyNFT (ERC-721)
 *
 * Platform-level NFT contract for images and video NFTs.
 * Managed entirely by Fandomly (backend mints on behalf of users).
 *
 * Features:
 *   - Collection-based minting (grouped NFTs with shared metadata theme)
 *   - Per-token IPFS URIs (images: "image" field, video: "animation_url" field)
 *   - Dynamic metadata updates (EIP-4906 MetadataUpdate events)
 *   - Royalty support (EIP-2981) for secondary market sales
 *   - Enumerable for querying user's owned tokens
 *   - Points cost tracking per collection (redeemed off-chain)
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FandomlyNFT is
    ERC721,
    ERC721URIStorage,
    ERC721Enumerable,
    ERC721Burnable,
    ERC721Royalty,
    AccessControl,
    Pausable,
    ReentrancyGuard
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 private _tokenIdCounter;

    struct Collection {
        string name;
        uint256 maxSupply;
        uint256 minted;
        uint256 pointsCost;   // Off-chain points required to redeem
        bool active;
    }

    mapping(uint256 => Collection) public collections;
    uint256 public nextCollectionId;
    mapping(uint256 => uint256) public tokenToCollection; // tokenId => collectionId

    event CollectionCreated(
        uint256 indexed collectionId,
        string name,
        uint256 maxSupply,
        uint256 pointsCost
    );
    event NFTMinted(
        uint256 indexed tokenId,
        uint256 indexed collectionId,
        address indexed recipient,
        string tokenUri
    );
    event MetadataUpdated(uint256 indexed tokenId);
    event CollectionActiveChanged(uint256 indexed collectionId, bool active);

    constructor() ERC721("Fandomly NFT", "FNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // ── Collection Management ──────────────────────────────────────────

    function createCollection(
        string calldata collectionName,
        uint256 maxSupply,
        uint256 pointsCost
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        require(bytes(collectionName).length > 0, "Empty name");
        require(maxSupply > 0, "Max supply must be > 0");

        uint256 collectionId = nextCollectionId++;
        collections[collectionId] = Collection({
            name: collectionName,
            maxSupply: maxSupply,
            minted: 0,
            pointsCost: pointsCost,
            active: true
        });

        emit CollectionCreated(collectionId, collectionName, maxSupply, pointsCost);
        return collectionId;
    }

    // ── Minting ────────────────────────────────────────────────────────

    /// Mint a single NFT with a per-token IPFS URI
    function mint(
        address to,
        uint256 collectionId,
        string calldata tokenUri
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused returns (uint256) {
        Collection storage collection = collections[collectionId];
        require(collection.active, "Collection not active");
        require(collection.minted < collection.maxSupply, "Collection sold out");

        uint256 tokenId = _tokenIdCounter++;
        collection.minted++;
        tokenToCollection[tokenId] = collectionId;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);

        emit NFTMinted(tokenId, collectionId, to, tokenUri);
        return tokenId;
    }

    // ── Dynamic NFTs ───────────────────────────────────────────────────

    /// Update metadata for an existing token (e.g., evolving badges)
    function updateTokenURI(
        uint256 tokenId,
        string calldata newUri
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        _setTokenURI(tokenId, newUri);
        emit MetadataUpdated(tokenId);
    }

    // ── Royalties (EIP-2981) ───────────────────────────────────────────

    function setDefaultRoyalty(
        address receiver,
        uint96 feeNumerator
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    // ── View Functions ─────────────────────────────────────────────────

    function getCollection(uint256 collectionId) external view returns (Collection memory) {
        return collections[collectionId];
    }

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokens;
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function setCollectionActive(
        uint256 collectionId,
        bool active
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(collections[collectionId].name).length > 0, "Collection does not exist");
        collections[collectionId].active = active;
        emit CollectionActiveChanged(collectionId, active);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ── Required Overrides (multiple inheritance) ──────────────────────

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
        override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Royalty, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
