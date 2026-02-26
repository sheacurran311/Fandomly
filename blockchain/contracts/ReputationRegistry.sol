// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title ReputationRegistry
 * @notice On-chain reputation scores (0-1000) for Fandomly users.
 *         Scores gate access to staking (500+) and token creation (750+).
 *         Only the backend deployer wallet (owner) can update scores.
 * @dev Deployed on Fandomly Chain L1 (Chain ID 31111, Fuji testnet).
 */
contract ReputationRegistry is Ownable, Pausable {
    // --- Constants ---
    uint256 public constant MAX_SCORE = 1000;

    // --- State ---
    mapping(address => uint256) private _scores;

    // --- Events ---
    event ScoreUpdated(
        address indexed user,
        uint256 oldScore,
        uint256 newScore,
        string reason
    );

    // --- Constructor ---
    constructor() {
        // OZ v4: Ownable() sets msg.sender as owner automatically
    }

    // --- Admin Functions ---

    /**
     * @notice Update a single user's reputation score.
     * @param user    The user's wallet address on the L1
     * @param newScore The new score (0-1000)
     * @param reason  Human-readable reason for the update
     */
    function updateScore(
        address user,
        uint256 newScore,
        string calldata reason
    ) external onlyOwner whenNotPaused {
        require(user != address(0), "Invalid address");
        require(newScore <= MAX_SCORE, "Score exceeds 1000");
        require(bytes(reason).length > 0, "Reason required");

        uint256 oldScore = _scores[user];
        _scores[user] = newScore;

        emit ScoreUpdated(user, oldScore, newScore, reason);
    }

    /**
     * @notice Batch-update reputation scores for multiple users.
     * @param users     Array of user addresses
     * @param newScores Array of new scores (must match users length)
     * @param reason    Shared reason for all updates in this batch
     */
    function batchUpdateScores(
        address[] calldata users,
        uint256[] calldata newScores,
        string calldata reason
    ) external onlyOwner whenNotPaused {
        require(users.length == newScores.length, "Length mismatch");
        require(users.length > 0, "Empty arrays");
        require(bytes(reason).length > 0, "Reason required");

        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid address");
            require(newScores[i] <= MAX_SCORE, "Score exceeds 1000");

            uint256 oldScore = _scores[users[i]];
            _scores[users[i]] = newScores[i];

            emit ScoreUpdated(users[i], oldScore, newScores[i], reason);
        }
    }

    // --- View Functions ---

    function getScore(address user) external view returns (uint256) {
        return _scores[user];
    }

    function meetsThreshold(address user, uint256 threshold) external view returns (bool) {
        return _scores[user] >= threshold;
    }

    // --- Emergency ---

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
