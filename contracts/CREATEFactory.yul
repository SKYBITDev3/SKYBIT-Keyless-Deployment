// SPDX-License-Identifier: MIT

/// @notice A factory contract that deploys a contract from bytecode using "CREATE3" method.
/// @author SKYBIT (https://github.com/SKYBITDev3/SKYBIT-Keyless-Deployment)
object "CREATEFactory" {
    code {
        datacopy(0, dataoffset("runtime"), datasize("runtime"))
        return (0, datasize("runtime"))
    }
    
    object "runtime" {
        code {
            calldatacopy(0x20, 0, calldatasize())
            mstore(0, create(0, 0x20, calldatasize())) // Create returns 0 if error

            return (12, 20) // Addresses are only 20 bytes, so skip the first 12 bytes
        }
    }
}
