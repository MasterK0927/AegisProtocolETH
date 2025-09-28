// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title X402CreditContract (deprecated)
/// @notice This placeholder remains only to preserve historical deployment
///         artifacts. Micropayments are now handled entirely off-chain via the
///         x402 facilitator gateway, so this contract MUST NOT be deployed or
///         referenced by new code.
contract X402CreditContract {
    error X402Deprecated();

    constructor() {
        revert X402Deprecated();
    }
}