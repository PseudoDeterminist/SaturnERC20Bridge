// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @dev Minimal interface for the legacy Saturn ERC223 token (Solidity 0.4.x era).
 *      Saturn supports both ERC20-style transfer(to,value) and ERC223 transfer(to,value,data).
 */
interface ISaturnERC223 {
    function transfer(address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value, bytes calldata data) external returns (bool);
}

/**
 * @title Saturn ERC20 Bridge
 * @notice Permanent 1:1 bridge between legacy SATURN (ERC223) and STRN (ERC20).
 *
 * How it works:
 * - Deposits are made by sending SATURN (ERC223) to this contract with the required tag,
 *   which mints STRN 1:1 to the sender via tokenFallback.
 * - redeem(amount): returns SATURN 1:1 to the caller and reduces STRN supply accordingly.
 *
 * Safety / UX notes:
 * - Deposits are accepted ONLY when SATURN calls tokenFallback with the required 4-byte tag.
 *   This prevents accidental direct SATURN transfers to the bridge.
 * - Redeeming to a contract that is not ERC223-aware may revert, because SATURN will call
 *   tokenFallback on contract recipients. Redeem is intended for EOAs / ERC223-aware contracts.
 */
contract SaturnERC20Bridge is ERC20 {
    /// @notice Legacy underlying token (ERC223).
    ISaturnERC223 public immutable SATURN;

    /// @notice 4-byte tag required in ERC223 data for deposits. "MINT"
    bytes4 public constant BRIDGE_TAG = 0x4d494e54;

    event Minted(address indexed account, uint256 amount);
    event Redeemed(address indexed account, uint256 amount);

    constructor(address saturnAddress) ERC20("Saturn DAO Token (ERC20)", "STRN") {
        require(saturnAddress != address(0), "SATURN=0");
        SATURN = ISaturnERC223(saturnAddress);
    }

    /// @dev Saturn uses 4 decimals; STRN matches it exactly.
    function decimals() public pure override returns (uint8) {
        return 4;
    }

    /**
     * @notice ERC223 receiver hook (called by SATURN).
     * @dev Accepts deposits only when data == BRIDGE_TAG.
     */
    function tokenFallback(address from, uint256 value, bytes calldata data) external {
        require(msg.sender == address(SATURN), "Only Saturn");
        require(value > 0, "Value=0");
        require(data.length == 4 && bytes4(data) == BRIDGE_TAG, "Use mint()");

        _mint(from, value);
        emit Minted(from, value);
    }

    /**
     * @notice Return STRN and receive SATURN 1:1.
     * @dev Internally reduces STRN supply, then transfers SATURN to msg.sender.
     */
    function redeem(uint256 amount) external returns (bool) {
        require(amount > 0, "Amount=0");

        _burn(msg.sender, amount);

        bool ok = SATURN.transfer(msg.sender, amount, bytes(""));
        require(ok, "Saturn transfer failed");

        emit Redeemed(msg.sender, amount);
        return true;
    }
}