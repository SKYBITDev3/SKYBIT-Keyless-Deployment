// SPDX-License-Identifier: MIT

/// @notice A factory contract that deploys a contract from bytecode using "CREATE3" method. Derived from https://github.com/Vectorized/solady/blob/main/src/utils/CREATE3.sol
/// @author SKYBIT (https://github.com/SKYBITDev3/SKYBIT-Keyless-Deployment)
object "SKYBITCREATE3FactoryLite" {
    code { // Constructor code of the contract        
        datacopy(0, dataoffset("runtime"), datasize("runtime")) // Deploy the contract
        return (0, datasize("runtime"))
    }

    object "runtime" {
        code { // Executable code of the object
            if gt(callvalue(), 0) { revert(0, 0) } // Protection against sending Ether

            /**
              @notice The bytecode for a contract that proxies the creation of another contract
              @dev If this code is deployed using CREATE2 it can be used to decouple `creationCode` from the child contract address
          
            0x67363d3d37363d34f03d5260086018f3:
                0x00  0x67  0x67XXXXXXXXXXXXXXXX  PUSH8 bytecode  0x363d3d37363d34f0
                0x01  0x3d  0x3d                  RETURNDATASIZE  0 0x363d3d37363d34f0
                0x02  0x52  0x52                  MSTORE
                0x03  0x60  0x6008                PUSH1 08        8
                0x04  0x60  0x6018                PUSH1 18        24 8
                0x05  0xf3  0xf3                  RETURN
          
            0x363d3d37363d34f0:
                0x00  0x36  0x36                  CALLDATASIZE    cds
                0x01  0x3d  0x3d                  RETURNDATASIZE  0 cds
                0x02  0x3d  0x3d                  RETURNDATASIZE  0 0 cds
                0x03  0x37  0x37                  CALLDATACOPY
                0x04  0x36  0x36                  CALLDATASIZE    cds
                0x05  0x3d  0x3d                  RETURNDATASIZE  0 cds
                0x06  0x34  0x34                  CALLVALUE       val 0 cds
                0x07  0xf0  0xf0                  CREATE          addr
            */
            mstore(0, 0x67363d3d37363d34f03d5260086018f3) // Store the CREATE proxy bytecode (16 bytes) into scratch space.

            mstore(0x20, caller()) // 32 bytes. to be hashed with salt to help ensure unique address.
            mstore(0x40, calldataload(0)) // User-provided salt (32 bytes)

            let proxy:= create2(0, 0x10, 0x10, keccak256(0x20, 0x40)) // Deploy the CREATE proxy via CREATE2, store address on the stack

            if iszero(proxy) {
                mstore(0, 0x335e7dd5) // Store ABI encoding of `Deployment of CREATE proxy failed`
                revert(0x1c, 4) // Revert with the stored 4 bytes skipping 0-padding
            }

            mstore(0x14, proxy) // Store the proxy's address. The actual address starts at 0x20 because of 0-padding on left. Positioned so that RLP encoding prefix can be placed just before.

            // "if a string is 0-55 bytes long, the RLP encoding consists of a single byte with value 0x80 (dec. 128) plus the length of the string followed by the string."
            // "If the total payload of a list (i.e. the combined length of all its items being RLP encoded) is 0-55 bytes long, the RLP encoding consists of a single byte with value 0xc0 plus the length of the list followed by the concatenation of the RLP encodings of the items"
            // Source: https://ethereum.org/en/developers/docs/data-structures-and-encoding/rlp
            // 0xd6 = 0xc0 (short RLP prefix) + 0x16 (length of: 0x94 ++ proxy ++ 0x01)
            // 0x94 = 0x80 + 0x14 (0x14 = the length of an address, 20 bytes, in hex)
            mstore(0, 0xd694) // Store RLP encoding prefix just before proxy address
            mstore8(0x34, 1) // Store single byte: nonce of the proxy contract just after proxy address

            let deployed:= keccak256(0x1e, 0x17) // Address from CREATE = hash of RLP-encoded proxy address and nonce

            calldatacopy(0, 32, sub(calldatasize(), 32)) // Overwrite scratch at memory position 0 with incoming creationCode. We take full control of memory because it won't return to Solidity code. We don't need the previously stored data anymore.

            if iszero(
                call( // Use the CREATE proxy to deploy the users' contract. Returns 1 if successful.
                    gas(), // Gas remaining
                    proxy, // Proxy's address
                    0, // Ether value
                    0, // Start of `creationCode`
                    sub(calldatasize(), 32), // Length of `creationCode`
                    0, // Offset of output
                    0 // Length of output
                )
            ) {
                mstore(0, 0xec4cb4b6) // Store ABI encoding of `CREATE proxy call failed`
                revert(0x1c, 4)
            }

            if iszero(extcodesize(deployed)) {
                mstore(0, 0x326bd139) // Store ABI encoding of `Contract nonexistent at expected address`
                revert(0x1c, 4)
            }

            mstore(0, deployed)
            return (12, 20) // Addresses are only 20 bytes, so skip the first 12 bytes as it's just 0-padding
        }
    }
}
