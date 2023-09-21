// SPDX-License-Identifier: MIT

/// @notice A factory contract that deploys a contract from bytecode using "CREATE3" method.
/// @author SKYBIT (https://github.com/SKYBITDev3/SKYBIT-Keyless-Deployment)
object "SKYBITCREATE3FactoryLite" {
    code { // Constructor code of the contract        
        datacopy(0, dataoffset("runtime"), datasize("runtime")) // Deploy the contract
        return (0, datasize("runtime"))
    }

    object "runtime" {
        code { // Executable code of the object
            if gt(callvalue(), 0) { revert(0, 0) } // Protection against sending Ether

            mstore(0, caller()) // 32 bytes. The user's address.
            mstore(0x20, calldataload(0)) // 32 bytes. User-provided salt.
            let callerAndSaltHash := keccak256(0, 0x40) // hash caller with salt to help ensure unique address, prevent front-running. It's cheaper to take whole slots (include padded 0s). Store result on stack.

            datacopy(0, dataoffset("CREATEFactory"), datasize("CREATEFactory")) // Write CREATEFactory bytecode to memory position 0, overwriting previous data. Data is on left of slot, 0-padded on right.
            let createFactoryAddress := create2(0, 0, datasize("CREATEFactory"), callerAndSaltHash) // Deploy the CREATE factory via CREATE2, store its address on the stack.

            if iszero(createFactoryAddress) {
                mstore8(0, 1) // An error code made up to help identify where it failed
                revert(0, 1) // Return the error code so that it appears for user
            }

            mstore(0, 0) // make first slot 0 to reserve for address from call output
            
            let creationCodeSize := sub(calldatasize(), 32) // Store creation code size on stack. Skipping first 32 bytes of calldata which is salt.
            calldatacopy(0x20, 32, creationCodeSize) // Overwrite memory from position 0x20 with incoming contract creation code. We take full control of memory because it won't return to Solidity code.

            if iszero(
                call( // Use the deployed CREATEFactory to deploy the user's contract. Returns 0 on error (eg. out of gas) and 1 on success.
                    gas(), // Gas remaining
                    createFactoryAddress,
                    0, // Native currency value to send
                    0x20, // Start of contract creation code
                    creationCodeSize, // Length of contract creation code
                    0, // Offset of output. Resulting address of deployed user's contract starts here. If call fails then whatever was here may remain, so we left it empty beforehand.
                    20 // Length of output (address is 20 bytes)
                )
            ) {
                mstore8(0, 2) // An error code made up to help identify where it failed
                revert(0, 1)
            }

            if iszero(mload(0)) { // Call output was 0 or not received
                mstore8(0, 3) // An error code made up to help identify where it failed
                revert(0, 1)
            }

            return (0, 20) // Return the call output, which is the address (20 bytes) of the contract that was deployed via CREATEFactory
        }

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
    }
}
