// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

struct Point {
    uint x;
    uint y;
}

contract TESTERC20UGv2 is Initializable, ERC20Upgradeable, AccessControlUpgradeable, ERC20PermitUpgradeable, UUPSUpgradeable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    mapping (address=>Point) public points;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address adminAddress, Point memory _point) initializer public {
        __ERC20_init("Token 8942", "TOKEN8942");
        __AccessControl_init();
        __ERC20Permit_init("Token 8942");
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
        _grantRole(MINTER_ROLE, adminAddress);
        _grantRole(UPGRADER_ROLE, adminAddress);

        points[adminAddress] = _point;
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    function getV() public pure returns (uint8) {
     return 2;
    }

}