// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PraiseBoard
 * @dev Tip jar smart contract for the Praise Board dApp.
 * Emits TipReceived events on tip, which serve as the strict single source of truth
 * for the supporter wall.
 */
contract PraiseBoard {
    address public immutable owner;
    uint256 public constant MAX_NOTE_LENGTH = 280; // enforced on-chain
    uint256 public totalTips;

    event TipReceived(address indexed sender, uint256 amount, string note, uint256 timestamp);

    error NoteTooLong();
    error ZeroTip();
    error NothingToWithdraw();
    error NotOwner();
    error WithdrawFailed();

    uint256 private _balance; // tracked explicitly so we can zero it before external calls
    bool private _locked;     // reentrancy guard

    constructor() {
        owner = msg.sender;
    }

    modifier nonReentrant() {
        require(!_locked, "reentrant");
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /**
     * @dev Send a tip with an attached note.
     * @param note Message attached to the tip (max 280 bytes).
     */
    function tip(string calldata note) external payable {
        if (msg.value == 0) revert ZeroTip();
        if (bytes(note).length > MAX_NOTE_LENGTH) revert NoteTooLong();
        _balance += msg.value;
        totalTips++;
        emit TipReceived(msg.sender, msg.value, note, block.timestamp);
    }

    /**
     * @dev Withdraw accumulated ETH tips to contract owner.
     * Follows Checks-Effects-Interactions pattern (zeroes _balance before transfer).
     */
    function withdraw() external onlyOwner nonReentrant {
        uint256 amount = _balance;
        if (amount == 0) revert NothingToWithdraw();
        _balance = 0; // State change before external call
        (bool ok, ) = owner.call{value: amount}("");
        if (!ok) revert WithdrawFailed();
    }

    /**
     * @dev Get current tracked ETH balance.
     */
    function contractBalance() external view returns (uint256) {
        return _balance;
    }

    /**
     * @dev Allow direct ETH transfers to also register as tips with empty notes.
     */
    receive() external payable {
        if (msg.value == 0) revert ZeroTip();
        _balance += msg.value;
        totalTips++;
        emit TipReceived(msg.sender, msg.value, "", block.timestamp);
    }
}
