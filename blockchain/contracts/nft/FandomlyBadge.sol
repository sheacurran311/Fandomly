// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * FandomlyBadge (ERC-1155)
 *
 * Shared badge contract for BOTH platform and creator badges.
 * Supports soulbound (non-transferable) and transferable badge types.
 *
 * Two-tier ownership:
 *   - Platform badges:  creator = address(0), managed by DEFAULT_ADMIN_ROLE
 *   - Creator badges:   creator = creator's wallet, managed by MINTER_ROLE (backend)
 *
 * The backend (deployer wallet) holds MINTER_ROLE and mints on behalf of both
 * the platform and individual creators. Creators never need FAN for gas.
 */

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract FandomlyBadge is ERC1155, ERC1155Supply, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_BATCH_SIZE = 500;

    string public name = "Fandomly Badge";
    string public symbol = "FBADGE";

    struct BadgeType {
        string uri;           // IPFS metadata URI (ipfs://Qm.../0)
        address creator;      // address(0) = platform badge, else = creator's address
        bool soulbound;       // Non-transferable if true
        uint256 maxSupply;    // 0 = unlimited
        bool active;
    }

    mapping(uint256 => BadgeType) public badgeTypes;
    uint256 public nextBadgeTypeId;

    // All badges created by a specific creator
    mapping(address => uint256[]) private _creatorBadgeTypes;

    event BadgeTypeCreated(
        uint256 indexed badgeTypeId,
        address indexed creator,
        string uri,
        bool soulbound,
        uint256 maxSupply
    );
    event BadgeMinted(uint256 indexed badgeTypeId, address indexed recipient, uint256 amount);
    event BadgeBatchMinted(uint256 indexed badgeTypeId, address[] recipients, uint256 amountEach);
    event BadgeActiveChanged(uint256 indexed badgeTypeId, bool active);
    event BadgeURIUpdated(uint256 indexed badgeTypeId, string newUri);

    constructor() ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // ── Badge Type Management ──────────────────────────────────────────

    /// Create a platform-wide badge type (creator = address(0))
    function createPlatformBadgeType(
        string calldata badgeUri,
        bool soulbound,
        uint256 maxSupply
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        return _createBadgeType(badgeUri, address(0), soulbound, maxSupply);
    }

    /// Create a creator-owned badge type
    function createCreatorBadgeType(
        string calldata badgeUri,
        address creator,
        bool soulbound,
        uint256 maxSupply
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        require(creator != address(0), "Invalid creator address");
        return _createBadgeType(badgeUri, creator, soulbound, maxSupply);
    }

    function _createBadgeType(
        string calldata badgeUri,
        address creator,
        bool soulbound,
        uint256 maxSupply
    ) internal returns (uint256) {
        require(bytes(badgeUri).length > 0, "Empty URI");

        uint256 badgeTypeId = nextBadgeTypeId++;
        badgeTypes[badgeTypeId] = BadgeType({
            uri: badgeUri,
            creator: creator,
            soulbound: soulbound,
            maxSupply: maxSupply,
            active: true
        });

        if (creator != address(0)) {
            _creatorBadgeTypes[creator].push(badgeTypeId);
        }

        emit BadgeTypeCreated(badgeTypeId, creator, badgeUri, soulbound, maxSupply);
        return badgeTypeId;
    }

    // ── Minting ────────────────────────────────────────────────────────

    /// Mint a badge to a single recipient
    function mint(
        address to,
        uint256 badgeTypeId,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        BadgeType storage badge = badgeTypes[badgeTypeId];
        require(badge.active, "Badge type not active");
        require(bytes(badge.uri).length > 0, "Badge type does not exist");

        if (badge.maxSupply > 0) {
            require(totalSupply(badgeTypeId) + amount <= badge.maxSupply, "Exceeds max supply");
        }

        _mint(to, badgeTypeId, amount, "");
        emit BadgeMinted(badgeTypeId, to, amount);
    }

    /// Batch-mint a badge to multiple recipients (airdrops)
    function batchMintToMany(
        address[] calldata recipients,
        uint256 badgeTypeId,
        uint256 amountEach
    ) external onlyRole(MINTER_ROLE) nonReentrant whenNotPaused {
        BadgeType storage badge = badgeTypes[badgeTypeId];
        require(badge.active, "Badge type not active");
        require(bytes(badge.uri).length > 0, "Badge type does not exist");
        require(recipients.length > 0, "No recipients");
        require(recipients.length <= MAX_BATCH_SIZE, "Batch too large");

        if (badge.maxSupply > 0) {
            require(
                totalSupply(badgeTypeId) + (amountEach * recipients.length) <= badge.maxSupply,
                "Exceeds max supply"
            );
        }

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], badgeTypeId, amountEach, "");
        }

        emit BadgeBatchMinted(badgeTypeId, recipients, amountEach);
    }

    // ── Transfer Restrictions (Soulbound) ──────────────────────────────

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155, ERC1155Supply) whenNotPaused {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

        // Allow minting (from = 0) and burning (to = 0)
        if (from == address(0) || to == address(0)) return;

        // Block transfers of soulbound badges
        for (uint256 i = 0; i < ids.length; i++) {
            require(!badgeTypes[ids[i]].soulbound, "Soulbound: non-transferable");
        }
    }

    // ── View Functions ─────────────────────────────────────────────────

    function uri(uint256 badgeTypeId) public view override returns (string memory) {
        require(bytes(badgeTypes[badgeTypeId].uri).length > 0, "Badge type does not exist");
        return badgeTypes[badgeTypeId].uri;
    }

    function getBadgeType(uint256 badgeTypeId) external view returns (BadgeType memory) {
        return badgeTypes[badgeTypeId];
    }

    function getCreatorBadgeTypes(address creator) external view returns (uint256[] memory) {
        return _creatorBadgeTypes[creator];
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function setActive(uint256 badgeTypeId, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(badgeTypes[badgeTypeId].uri).length > 0, "Badge type does not exist");
        badgeTypes[badgeTypeId].active = active;
        emit BadgeActiveChanged(badgeTypeId, active);
    }

    function updateBadgeURI(uint256 badgeTypeId, string calldata newUri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bytes(newUri).length > 0, "Empty URI");
        require(bytes(badgeTypes[badgeTypeId].uri).length > 0, "Badge type does not exist");
        badgeTypes[badgeTypeId].uri = newUri;
        emit BadgeURIUpdated(badgeTypeId, newUri);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ── Interface Support ──────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
