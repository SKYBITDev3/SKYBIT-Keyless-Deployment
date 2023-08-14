// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
// import "hardhat/console.sol";

struct Point {
    uint x;
    uint y;
}

contract TESTERC20 is ERC20, ERC20Permit, AccessControl {
    Point public point;
    bytes public b;

    constructor(
        string memory name,
        string memory symbol,
        uint initialSupply,
        address[] memory initialHolders,
        Point memory _point,
        bytes memory _b
    ) ERC20(name, symbol) ERC20Permit(name) {
        _mint(
            initialHolders[0],
            (10 * (initialSupply * 10 ** decimals())) / 100
        );
        _mint(
            initialHolders[1],
            (90 * (initialSupply * 10 ** decimals())) / 100
        );

        point = _point;
        b = _b;

        _grantRole(DEFAULT_ADMIN_ROLE, initialHolders[0]);
    }
}
