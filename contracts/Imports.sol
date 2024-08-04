// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// To force hardhat to compile the files into artifacts directory
import {Create3Deployer} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/deploy/Create3Deployer.sol"; // needed in scripts > deployKeylessly-Create3Factory.js > getCreate3FactoryArtifact
import {CREATE3Factory} from "@SKYBITDev3/ZeframLou-create3-factory/src/CREATE3Factory.sol"; // needed in scripts > deployKeylessly-Create3Factory.js > getCreate3FactoryArtifact
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol"; // needed in upgradeable contract deployment via CREATE3
