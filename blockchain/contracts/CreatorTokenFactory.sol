// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./CreatorToken.sol";

interface IReputationRegistry {
    function meetsThreshold(address user, uint256 threshold) external view returns (bool);
}

/**
 * @title CreatorTokenFactory
 * @notice Factory that deploys one ERC-20 CreatorToken per creator, scoped to a tenant.
 *         Enforces reputation gate: creator must have score >= 750 to launch a token.
 *         Only callable by the backend deployer wallet (owner).
 * @dev Deployed on Fandomly Chain L1 (Chain ID 31111, Fuji testnet).
 */
contract CreatorTokenFactory is Ownable, Pausable, ReentrancyGuard {
    // --- Constants ---
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18; // 1M tokens per creator
    uint256 public constant MIN_REPUTATION_TO_CREATE = 750;

    // --- State ---
    IReputationRegistry public reputationRegistry;

    mapping(address => address) public creatorToToken;             // creator -> token address
    mapping(string => address[]) private _tenantTokens;            // tenantId -> token[]
    mapping(address => bool) public isCreatorToken;                // token address -> is valid
    uint256 public totalTokensCreated;

    // --- Events ---
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string tenantId,
        string name,
        string symbol,
        uint256 initialSupply
    );

    // --- Constructor ---
    constructor(address reputationRegistry_) {
        require(reputationRegistry_ != address(0), "Invalid registry");
        reputationRegistry = IReputationRegistry(reputationRegistry_);
    }

    // --- Core Functions ---

    /**
     * @notice Deploy a new CreatorToken for a creator.
     * @param name            Token name (e.g. "CreatorName Fan Token")
     * @param symbol          Token symbol (e.g. "CRFAN")
     * @param creatorAddress  The creator's wallet on the L1
     * @param tenantId        Fandomly tenant/store ID scoping this token
     * @return tokenAddress   The deployed token contract address
     */
    function createToken(
        string calldata name,
        string calldata symbol,
        address creatorAddress,
        string calldata tenantId
    ) external onlyOwner nonReentrant whenNotPaused returns (address tokenAddress) {
        require(creatorAddress != address(0), "Invalid creator");
        require(bytes(name).length > 0, "Empty name");
        require(bytes(symbol).length > 0, "Empty symbol");
        require(bytes(tenantId).length > 0, "Empty tenantId");
        require(creatorToToken[creatorAddress] == address(0), "Creator already has token");
        require(
            reputationRegistry.meetsThreshold(creatorAddress, MIN_REPUTATION_TO_CREATE),
            "Insufficient reputation (need 750+)"
        );

        // Deploy new CreatorToken -- factory (this contract) becomes the owner
        CreatorToken newToken = new CreatorToken(
            name,
            symbol,
            creatorAddress,
            tenantId,
            INITIAL_SUPPLY
        );

        tokenAddress = address(newToken);

        // Update state
        creatorToToken[creatorAddress] = tokenAddress;
        _tenantTokens[tenantId].push(tokenAddress);
        isCreatorToken[tokenAddress] = true;
        totalTokensCreated++;

        emit TokenCreated(tokenAddress, creatorAddress, tenantId, name, symbol, INITIAL_SUPPLY);
    }

    // --- View Functions ---

    function getTenantTokens(string calldata tenantId) external view returns (address[] memory) {
        return _tenantTokens[tenantId];
    }

    function getTenantTokenCount(string calldata tenantId) external view returns (uint256) {
        return _tenantTokens[tenantId].length;
    }

    // --- Admin ---

    function setReputationRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "Invalid registry");
        reputationRegistry = IReputationRegistry(newRegistry);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
