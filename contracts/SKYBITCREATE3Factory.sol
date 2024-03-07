// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CREATE3} from "@Vectorized/solady/src/utils/CREATE3.sol";

/// @title Factory for deploying contracts to deterministic addresses via CREATE3
/// @author zefram.eth, SKYBIT
/// @notice Enables deploying contracts using CREATE3. Each deployer (msg.sender) has
/// its own namespace for deployed addresses.
contract SKYBITCREATE3Factory {
    function deploy(
        bytes32 salt,
        bytes memory creationCode
    ) external payable returns (address deployed) {
        // hash salt with the deployer address to give each deployer its own namespace
        salt = keccak256(abi.encodePacked(msg.sender, salt));
        return CREATE3.deploy(salt, creationCode, msg.value);
    }

    function getDeployed(
        address deployer,
        bytes32 salt
    ) external pure returns (address deployed) {
        return CREATE3.getDeployed(salt, deployer);
    }
}
