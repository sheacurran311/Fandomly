// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IReputationRegistry {
    function meetsThreshold(address user, uint256 threshold) external view returns (bool);
}

interface ICreatorTokenFactory {
    function isCreatorToken(address token) external view returns (bool);
}

/**
 * @title FanStaking
 * @notice Fans stake creator tokens and earn native FAN rewards with social multipliers.
 *         - Social multipliers (YouTube 2.0x, Twitter 1.5x, etc.) are set by the backend.
 *         - Anti-bot: minimum 7-day stake duration, 5% slashing on early withdrawal.
 *         - Reputation gate: need 500+ to stake.
 *         - Rewards paid in native FAN (the L1's gas token), funded by the owner.
 * @dev Deployed on Fandomly Chain L1 (Chain ID 31111, Fuji testnet).
 *      The contract holds native FAN as the reward pool. Owner funds it via fundRewardPool().
 */
contract FanStaking is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Structs ---
    struct StakeInfo {
        uint256 amount;           // Amount of creator tokens staked
        uint256 stakedAt;         // Timestamp when staked (resets on additional stake)
        uint256 lastClaimAt;      // Timestamp of last reward claim
    }

    // --- Constants ---
    uint256 public constant MIN_STAKE_DURATION = 7 days;
    uint256 public constant EARLY_WITHDRAWAL_PENALTY_BPS = 500;  // 5% in basis points
    uint256 public constant BASE_APY_BPS = 500;                  // 5% base APY
    uint256 public constant MULTIPLIER_BASE = 100;               // 1.0x = 100
    uint256 public constant MAX_MULTIPLIER = 500;                // 5.0x = 500
    uint256 public constant MIN_REPUTATION_TO_STAKE = 500;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // --- State ---
    IReputationRegistry public reputationRegistry;
    ICreatorTokenFactory public tokenFactory;

    // user -> token -> stake info
    mapping(address => mapping(address => StakeInfo)) public stakes;
    // user -> social multiplier (basis points: 100 = 1.0x, 200 = 2.0x)
    mapping(address => uint256) public userMultipliers;
    // token -> total amount staked across all users
    mapping(address => uint256) public totalStaked;
    // Accumulated slashing penalties (withdrawable by owner)
    uint256 public accumulatedPenalties;
    // Total rewards distributed
    uint256 public totalRewardsDistributed;

    // --- Events ---
    event Staked(address indexed user, address indexed token, uint256 amount);
    event Unstaked(address indexed user, address indexed token, uint256 amount, uint256 penalty);
    event RewardsClaimed(address indexed user, address indexed token, uint256 amount);
    event MultiplierUpdated(address indexed user, uint256 oldMultiplier, uint256 newMultiplier);
    event RewardPoolFunded(address indexed funder, uint256 amount);
    event PenaltiesWithdrawn(address indexed to, uint256 amount);

    // --- Constructor ---
    constructor(address reputationRegistry_, address tokenFactory_) {
        require(reputationRegistry_ != address(0), "Invalid registry");
        require(tokenFactory_ != address(0), "Invalid factory");
        reputationRegistry = IReputationRegistry(reputationRegistry_);
        tokenFactory = ICreatorTokenFactory(tokenFactory_);
    }

    // --- Receive native FAN for reward pool ---
    receive() external payable {
        emit RewardPoolFunded(msg.sender, msg.value);
    }

    // --- Core Staking Functions ---

    /**
     * @notice Stake creator tokens to earn FAN rewards.
     * @param token  The creator token address (must be from our factory)
     * @param amount Amount of creator tokens to stake
     */
    function stake(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Cannot stake 0");
        require(
            tokenFactory.isCreatorToken(token),
            "Not a valid creator token"
        );
        require(
            reputationRegistry.meetsThreshold(msg.sender, MIN_REPUTATION_TO_STAKE),
            "Insufficient reputation (need 500+)"
        );

        StakeInfo storage info = stakes[msg.sender][token];

        // Claim pending rewards before modifying stake
        if (info.amount > 0) {
            _claimRewards(msg.sender, token);
        }

        // Transfer creator tokens to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Update stake
        info.amount += amount;
        info.stakedAt = block.timestamp;
        info.lastClaimAt = block.timestamp;

        totalStaked[token] += amount;

        emit Staked(msg.sender, token, amount);
    }

    /**
     * @notice Unstake creator tokens. Early withdrawal (< 7 days) incurs 5% penalty.
     * @param token  The creator token address
     * @param amount Amount to unstake
     */
    function unstake(address token, uint256 amount) external nonReentrant whenNotPaused {
        StakeInfo storage info = stakes[msg.sender][token];
        require(info.amount >= amount, "Insufficient stake");
        require(amount > 0, "Cannot unstake 0");

        // Claim pending rewards first
        _claimRewards(msg.sender, token);

        // Calculate early withdrawal penalty
        uint256 penalty = 0;
        if (block.timestamp < info.stakedAt + MIN_STAKE_DURATION) {
            penalty = (amount * EARLY_WITHDRAWAL_PENALTY_BPS) / BPS_DENOMINATOR;
            accumulatedPenalties += penalty;
        }

        // Update state before transfer (CEI pattern)
        info.amount -= amount;
        totalStaked[token] -= amount;

        // Transfer tokens back (minus penalty)
        uint256 withdrawAmount = amount - penalty;
        IERC20(token).safeTransfer(msg.sender, withdrawAmount);

        // Penalty tokens stay in contract (withdrawable by owner for redistribution)

        emit Unstaked(msg.sender, token, amount, penalty);
    }

    /**
     * @notice Claim accumulated FAN rewards for a staked token.
     * @param token The creator token address
     */
    function claimRewards(address token) external nonReentrant whenNotPaused {
        _claimRewards(msg.sender, token);
    }

    // --- Internal ---

    function _claimRewards(address user, address token) internal {
        StakeInfo storage info = stakes[user][token];
        if (info.amount == 0) return;

        uint256 rewards = calculateRewards(user, token);
        if (rewards == 0) return;

        // Check reward pool has enough native FAN
        require(address(this).balance >= rewards + accumulatedPenalties, "Reward pool insufficient");

        // Update state before transfer (CEI pattern)
        info.lastClaimAt = block.timestamp;
        totalRewardsDistributed += rewards;

        // Transfer native FAN rewards
        (bool success, ) = payable(user).call{value: rewards}("");
        require(success, "Reward transfer failed");

        emit RewardsClaimed(user, token, rewards);
    }

    // --- View Functions ---

    /**
     * @notice Calculate pending rewards for a user's stake on a token.
     * @dev rewards = stakedAmount * baseAPY * timeElapsed * multiplier / (365 days * BPS^2)
     */
    function calculateRewards(address user, address token) public view returns (uint256) {
        StakeInfo memory info = stakes[user][token];
        if (info.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp - info.lastClaimAt;
        if (timeElapsed == 0) return 0;

        uint256 multiplier = userMultipliers[user];
        if (multiplier == 0) multiplier = MULTIPLIER_BASE; // Default 1.0x

        // baseReward = amount * APY_BPS * time / (365 days * 10000)
        uint256 baseReward = (info.amount * BASE_APY_BPS * timeElapsed) / (365 days * BPS_DENOMINATOR);

        // Apply social multiplier: reward * multiplier / 100
        uint256 finalReward = (baseReward * multiplier) / MULTIPLIER_BASE;

        return finalReward;
    }

    function getStakeInfo(address user, address token) external view returns (StakeInfo memory) {
        return stakes[user][token];
    }

    function getRewardPoolBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // --- Admin Functions ---

    /**
     * @notice Set a user's social multiplier. Called by backend after verifying social connections.
     * @param user       The user's wallet address
     * @param multiplier The multiplier in basis points (100 = 1.0x, 200 = 2.0x, etc.)
     *                   YouTube: 200, Twitter: 150, Instagram: 130, TikTok: 120, Discord: 110
     */
    function setUserMultiplier(address user, uint256 multiplier) external onlyOwner {
        require(user != address(0), "Invalid user");
        require(multiplier >= MULTIPLIER_BASE && multiplier <= MAX_MULTIPLIER, "Invalid multiplier range");

        uint256 oldMultiplier = userMultipliers[user];
        userMultipliers[user] = multiplier;

        emit MultiplierUpdated(user, oldMultiplier, multiplier);
    }

    /**
     * @notice Batch set multipliers for multiple users.
     */
    function batchSetMultipliers(
        address[] calldata users,
        uint256[] calldata multipliers
    ) external onlyOwner {
        require(users.length == multipliers.length, "Length mismatch");
        for (uint256 i = 0; i < users.length; i++) {
            require(users[i] != address(0), "Invalid user");
            require(
                multipliers[i] >= MULTIPLIER_BASE && multipliers[i] <= MAX_MULTIPLIER,
                "Invalid multiplier"
            );

            uint256 oldMultiplier = userMultipliers[users[i]];
            userMultipliers[users[i]] = multipliers[i];

            emit MultiplierUpdated(users[i], oldMultiplier, multipliers[i]);
        }
    }

    /**
     * @notice Fund the reward pool with native FAN.
     */
    function fundRewardPool() external payable onlyOwner {
        require(msg.value > 0, "Must send FAN");
        emit RewardPoolFunded(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw accumulated slashing penalties.
     */
    function withdrawPenalties(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 amount = accumulatedPenalties;
        require(amount > 0, "No penalties to withdraw");

        accumulatedPenalties = 0;

        // Note: penalties are in creator tokens, not native FAN
        // This function withdraws the native FAN equivalent
        // For creator token penalties, use withdrawPenaltyTokens()
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "Withdrawal failed");

        emit PenaltiesWithdrawn(to, amount);
    }

    /**
     * @notice Withdraw slashed creator tokens that accumulated from early unstaking.
     * @param token The creator token to withdraw penalties for
     * @param to    Destination address
     */
    function withdrawPenaltyTokens(address token, address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        // The penalty tokens are already in the contract from unstake()
        // Calculate: contract balance - total staked = penalty tokens available
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        uint256 available = contractBalance - totalStaked[token];
        require(available > 0, "No penalty tokens");

        IERC20(token).safeTransfer(to, available);
    }

    function setReputationRegistry(address newRegistry) external onlyOwner {
        require(newRegistry != address(0), "Invalid registry");
        reputationRegistry = IReputationRegistry(newRegistry);
    }

    function setTokenFactory(address newFactory) external onlyOwner {
        require(newFactory != address(0), "Invalid factory");
        tokenFactory = ICreatorTokenFactory(newFactory);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
