// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * CreatorCollectionFactory
 *
 * Factory contract that deploys per-creator ERC-721 NFT collections.
 * Mirrors the CreatorTokenFactory pattern for ERC-20 tokens.
 *
 * Flow:
 *   1. Creator requests collection via Fandomly UI
 *   2. Backend calls createCollection()
 *   3. Factory deploys a new CreatorCollection contract
 *   4. Creator's wallet receives royalties from secondary sales
 *   5. Backend mints NFTs on behalf of creator (creator pays no gas)
 *
 * Access control:
 *   - Factory owner (deployer wallet) creates collections
 *   - Factory owner is also owner of each child collection
 *   - Optional reputation gate for collection creation
 */

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./CreatorCollection.sol";

interface IReputationRegistry {
    function meetsThreshold(address user, uint256 threshold) external view returns (bool);
}

contract CreatorCollectionFactory is Ownable, Pausable, ReentrancyGuard {
    /// Minimum reputation to create an NFT collection (0 = no requirement)
    uint256 public minReputationToCreate;

    IReputationRegistry public reputationRegistry;

    /// Creator address => list of deployed collection addresses
    mapping(address => address[]) private _creatorCollections;

    /// Tenant ID => list of deployed collection addresses
    mapping(string => address[]) private _tenantCollections;

    /// Quick lookup: is this address a collection deployed by this factory?
    mapping(address => bool) public isCreatorCollection;

    uint256 public totalCollectionsCreated;

    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string tenantId,
        string name,
        string symbol,
        uint256 maxSupply,
        uint96 royaltyBps
    );
    event MinReputationUpdated(uint256 oldMin, uint256 newMin);
    event ReputationRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    constructor(address reputationRegistry_) {
        require(reputationRegistry_ != address(0), "Invalid registry");
        reputationRegistry = IReputationRegistry(reputationRegistry_);
        minReputationToCreate = 0; // No reputation gate by default
    }

    // ── Collection Deployment ──────────────────────────────────────────

    function createCollection(
        string calldata name,
        string calldata symbol,
        address creatorAddress,
        string calldata tenantId,
        uint256 maxSupply,
        uint96 royaltyBps
    ) external onlyOwner nonReentrant whenNotPaused returns (address collectionAddress) {
        require(creatorAddress != address(0), "Invalid creator");
        require(bytes(name).length > 0, "Empty name");
        require(bytes(symbol).length > 0, "Empty symbol");
        require(bytes(tenantId).length > 0, "Empty tenantId");
        require(maxSupply > 0, "Max supply must be > 0");
        require(royaltyBps <= 1000, "Royalty exceeds 10%"); // Cap at 10%

        // Optional reputation gate
        if (minReputationToCreate > 0) {
            require(
                reputationRegistry.meetsThreshold(creatorAddress, minReputationToCreate),
                "Insufficient reputation"
            );
        }

        CreatorCollection newCollection = new CreatorCollection(
            name,
            symbol,
            creatorAddress,
            tenantId,
            maxSupply,
            royaltyBps
        );

        // FIX C-2: Transfer ownership to deployer wallet so backend can call mint().
        // Without this, the factory (this contract) would be the owner, but has no
        // mint-forwarding function, permanently locking the mint capability.
        newCollection.transferOwnership(owner());

        collectionAddress = address(newCollection);

        _creatorCollections[creatorAddress].push(collectionAddress);
        _tenantCollections[tenantId].push(collectionAddress);
        isCreatorCollection[collectionAddress] = true;
        totalCollectionsCreated++;

        emit CollectionCreated(
            collectionAddress,
            creatorAddress,
            tenantId,
            name,
            symbol,
            maxSupply,
            royaltyBps
        );
    }

    // ── View Functions ─────────────────────────────────────────────────

    function getCreatorCollections(address creator) external view returns (address[] memory) {
        return _creatorCollections[creator];
    }

    function getCreatorCollectionCount(address creator) external view returns (uint256) {
        return _creatorCollections[creator].length;
    }

    function getTenantCollections(string calldata tenantId) external view returns (address[] memory) {
        return _tenantCollections[tenantId];
    }

    function getTenantCollectionCount(string calldata tenantId) external view returns (uint256) {
        return _tenantCollections[tenantId].length;
    }

    // ── Admin ──────────────────────────────────────────────────────────

    function setMinReputationToCreate(uint256 minReputation) external onlyOwner {
        uint256 oldMin = minReputationToCreate;
        minReputationToCreate = minReputation;
        emit MinReputationUpdated(oldMin, minReputation);
    }

    function setReputationRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "Invalid registry");
        address oldRegistry = address(reputationRegistry);
        reputationRegistry = IReputationRegistry(newRegistry);
        emit ReputationRegistryUpdated(oldRegistry, newRegistry);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
