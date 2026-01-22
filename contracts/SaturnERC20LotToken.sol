// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SaturnERC20LotToken
 * @notice Canonical 10K-lot token for STRN.
 *
 * Token metadata:
 * - Name:    "Saturn 10K Lot Token"
 * - Symbol:  "STRN10K"
 * - Decimals: 0 (whole lots only)
 *
 * Economic meaning:
 * - 1 STRN10K = 10,000.0000 STRN
 * - Assumes STRN uses 4 decimals (so 10,000.0000 STRN = 10,000 * 10^4 base units)
 *
 * Conversions:
 * - deposit(strnAmount): pulls STRN and mints STRN10K (whole lots)
 * - redeem(lots): burns STRN10K and returns the corresponding STRN
 *
 * Safety:
 * - Does not accept ERC223 deposits.
 */
contract SaturnERC20LotToken is ERC20 {
    using SafeERC20 for IERC20;

    /// @notice Underlying ERC20 token (STRN).
    IERC20 public immutable STRN;

    /// @notice 10,000.0000 STRN expressed in STRN base units (assumes 4 decimals).
    uint256 public constant LOT_SIZE = 10_000 * 10**4; // 100,000,000

    event Deposited(address indexed account, uint256 strnIn, uint256 lotsOut);
    event Redeemed(address indexed account, uint256 lotsIn, uint256 strnOut);

    constructor(address strnAddress) ERC20("Saturn 10K Lot Token", "STRN10K") {
        require(strnAddress != address(0), "STRN=0");
        STRN = IERC20(strnAddress);
    }

    /// @notice Whole lots only.
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /**
     * @notice Deposit STRN in exact lot-multiples and mint STRN10K.
     * @dev Requires prior STRN approval for this contract.
     * @param strnAmount Amount of STRN base units to deposit; must be a multiple of LOT_SIZE.
     * @return lotsMinted Number of STRN10K minted (strnAmount / LOT_SIZE).
     */
    function deposit(uint256 strnAmount) external returns (uint256 lotsMinted) {
        require(strnAmount != 0, "Amount=0");
        require(strnAmount % LOT_SIZE == 0, "Not multiple of lot");

        lotsMinted = strnAmount / LOT_SIZE;

        STRN.safeTransferFrom(msg.sender, address(this), strnAmount);

        _mint(msg.sender, lotsMinted);
        emit Deposited(msg.sender, strnAmount, lotsMinted);
    }

    /**
     * @notice Redeem STRN by returning STRN10K lots.
     * @param lots Number of STRN10K to redeem (whole lots).
     * @return strnOut Amount of STRN returned (lots * LOT_SIZE).
     */
    function redeem(uint256 lots) external returns (uint256 strnOut) {
        require(lots != 0, "Lots=0");

        strnOut = lots * LOT_SIZE;

        _burn(msg.sender, lots);
        STRN.safeTransfer(msg.sender, strnOut);

        emit Redeemed(msg.sender, lots, strnOut);
    }
}