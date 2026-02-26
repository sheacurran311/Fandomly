// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CreatorToken
 * @notice Individual ERC-20 token for a creator, deployed by CreatorTokenFactory.
 *         Each creator gets exactly one token, scoped to their tenant.
 * @dev Owner is the factory contract (not the creator) so admin functions
 *      are controlled by our backend. Creator receives the initial supply.
 */
contract CreatorToken is ERC20, ERC20Burnable, Pausable, Ownable {
    address public immutable creator;
    string public tenantId;

    constructor(
        string memory name_,
        string memory symbol_,
        address creator_,
        string memory tenantId_,
        uint256 initialSupply_
    ) ERC20(name_, symbol_) {
        // OZ v4: Ownable() sets msg.sender (the factory) as owner
        require(creator_ != address(0), "Invalid creator");
        require(bytes(tenantId_).length > 0, "Invalid tenantId");

        creator = creator_;
        tenantId = tenantId_;

        // Mint initial supply to the creator
        _mint(creator_, initialSupply_);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
