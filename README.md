# SKYBIT CREATE3 Factory Transactions
## Introduction
This tool is for anyone who wants to **deploy smart contracts to the same address** on multiple Ethereum-Virtual Machine (EVM)-based blockchains. [CREATE2](https://eips.ethereum.org/EIPS/eip-1014) or CREATE3 factories help to achieve this, either with one that already exists on a blockchain, or one that you first deploy to the blockchain. There can be pitfalls depending on which path you take (see the section [Problems that this tool solves](#problems-that-this-tool-solves) for details). It's important to consider your options before you start any deployments to a live blockchain, as it'd be **difficult to switch later** after realizing that you made a bad decision, especially if many users are already using the contracts that you had deployed.

This tool offers a method which may be best practice - first deploy a CREATE3 factory contract onto EVM-based blockchains via a **reusable signed raw deployment transaction** that is packaged for you instead of via a normal transaction. The deployed CREATE3 factory contract will have the same address on every blockchain that you deploy it to **regardless of who deployed it** (as long as the transaction data stays the same), because the special transaction is *already signed*, but not by your own account doing the deployment, so *your own address will not affect the resulting address* of the factory contract.

By using factories that have the *same address* on all EVM-based blockchains onto which you want to deploy other contracts, those contracts that you deployed via the factory will also have consistent address across all EVM-based blockchains.

Other people may have already deployed the factory contract onto some of your desired blockchains to the expected address (if they didn't change the deployment transaction data), in which case you won't need to deploy it on those blockchains - you can then just use those already-deployed factory contracts to deploy whatever other contracts you want to deploy.

## CREATE, CREATE2 and CREATE3
`CREATE` and `CREATE2` are opcodes in EVM-based blockchains for creating a smart contract from another smart contract.

### `CREATE`
Contract addresses are calculated using the:
* address of the creator of the contract;
* nonce (number of transactions the creator has done).

### `CREATE2`
Contract addresses are calculated using the
* address of the creator of the contract;
* bytecode of the contract;
* salt (a chosen value).

As the nonce is not required in the contract address calculation, it's possible to know the contract's address on the blockchain before it's deployed regardless of how many transactions have been done in the account.

### CREATE3
CREATE3 isn't itself an EVM opcode but a method that uses `CREATE` and `CREATE2` in combination to eliminate the bytecode from contract address calculation.

Internally, first `CREATE2` is used to deploy a CREATE factory or "proxy", which then uses `CREATE` to deploy your contract. So the only data required for address calculation is:
* address of the creator of the contract;
* salt (a chosen value).

You then won't have to worry about accidentally making changes to your contracts (which would cause a different deployment address with CREATE2).

It also makes it possible to:
* Deploy your contract with updated code / using newer compiler on a new blockchain that will have the same address as the older version that had already been deployed on other blockchains;
* use different constructor arguments on different blockchains.


## Usage
Run in a terminal:
```
git clone https://github.com/SKYBITDev3/SKYBIT-CREATE3-Factory-Transactions
cd skybit-create3-factory-transactions
yarn
```

In `scripts/deployCreate3FactoryFromRawTx.js` change the value of `factoryToDeploy` to the factory you want to deploy from the options available.

### Deploy CREATE3 factory on local blockchain
Start a blockchain node on your local machine in its own terminal:
```
yarn hardhat node
```
Run the script in a separate terminal to deploy the factory:
```
yarn hardhat run --network localhost scripts/deployCreate3FactoryFromRawTx.js
```

Output like this appears:
```
Using network: localhost (31337), account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 having 10000.0 of native currency, RPC url: http://127.0.0.1:8545
Derived address of transaction signer: 0x64C2520B09320d97ccc38E5e41bE2cb617f41337
Expected transaction ID: 0xfaed49a1cdaf6dc03b99681e6d3c12fa6c80bae439f4f0458ca1af43a76d0b45
Expected address of deployed axelarnetwork factory contract: 0xDd9F606e518A955Cd3800f18126DC14E54e4E995
Expected gas cost: 651440
gasFeeEstimate: 0.065144 of native currency
Minimum balance of signer required based on the gasPrice and gasLimit: 100000000000 x 900000 wei = 0.09 of native currency
balanceOfSigner: 0.0
There are insufficient funds at 0x64C2520B09320d97ccc38E5e41bE2cb617f41337 on localhost to push the transaction. Do you want to try to transfer 0.09 of native currency from your wallet 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 to there now (y/n)?
```
The script has detected that the transaction signer's account doesn't have enough funds for gas, so now you need to send some to it. If your own account has some funds then it asks you whether you want to transfer some funds from it. If that's OK then press 'y' and 'Enter'. Otherwise, press 'n'  and 'Enter', then transfer the required funds to the signer's address in any other way. Then run the script again.

If you press 'y' then output like this appears:
```
Transferring 0.09 of native currency from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 to 0x64C2520B09320d97ccc38E5e41bE2cb617f41337 on localhost...
0x64C2520B09320d97ccc38E5e41bE2cb617f41337 now has 0.09
Deploying axelarnetwork factory contract by pushing signed raw transaction to localhost...
axelarnetwork factory contract was successfully deployed to 0xDd9F606e518A955Cd3800f18126DC14E54e4E995 in transaction 0xfaed49a1cdaf6dc03b99681e6d3c12fa6c80bae439f4f0458ca1af43a76d0b45
```
Note the address of the deployed factory contract as you'll need it when you want to use it.

### Test the CREATE3 factory on local blockchain
`TESTERC20` as defined in `contracts\TESTERC20.sol` will be deployed using the factory that has been deployed.

In `scripts\deployUsingCreate3Factory-TESTERC20.js`, set the value of `addressOfFactory` to the correct address of the deployed factory contract.

Run the script to deploy `TESTERC20` using the factory:
```
yarn hardhat run --network localhost scripts/deployUsingCreate3Factory-TESTERC20.js
```
Output like this appears:
```
Using network: localhost (31337), account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 having 9999.909981625 of native currency, RPC url: http://127.0.0.1:8545
salt: 0x534b594249542e41534941205445535445524332302e2e2e2e2e2e2e2e2e2e00
Expected address of TESTERC20 using deployer at 0xDd9F606e518A955Cd3800f18126DC14E54e4E995: 0x88DCddf9FC5EecA013cFe5919606695E8Db36ce6
feeData: {"_type":"FeeData","gasPrice":"1674213014","maxFeePerGas":"2531556250","maxPriorityFeePerGas":"1000000000"}
functionCallGasCost: 2254028
gasFeeEstimate: 0.003773723011520392 of native currency
now calling deploy() in the CREATE3 factory...
TESTERC20 was successfully deployed to 0x88DCddf9FC5EecA013cFe5919606695E8Db36ce6
The actual deployment address matches the expected address
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 has 100.0 of 1000.0
0xEB2e452fC167b5bb948c6FC2c9215ce7F4064692 has 900.0 of 1000.0
point: 10,5
b: 0xabcdef
```
This shows that `TESTERC20` was deployed successfully using the CREATE3 factory. In particular, the constructor arguments of various types (`string`, `uint`, array, `struct`, `bytes`) were successfully passed into the deployed `TESTERC20` contract.

### Deploy CREATE3 factory to testnet or mainnet
Copy `.env.example` to `.env` and enter any necessary values, including your API key to verify your contract on the explorer of the blockchain you will use.

In `hardhat.config.js` do the following:

Set `accounts` to the one(s) that you will use.

Check whether the blockchains you will use are listed in [@wagmi/chains](https://github.com/wagmi-dev/references/blob/main/packages/chains/src/index.ts). If not, then add the blockchain info in `additionalNetworks`.

For the few blockchain names in [@wagmi/chains](https://github.com/wagmi-dev/references/blob/main/packages/chains/src/index.ts) that don't match exactly with names in [hardhat-verify](https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-verify/src/internal/chain-config.ts), use the [hardhat-verify](https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-verify/src/internal/chain-config.ts) version as shown in this table:

| In [@wagmi/chains](https://github.com/wagmi-dev/references/blob/main/packages/chains/src/index.ts) | In [hardhat-verify](https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-verify/src/internal/chain-config.ts) (use these) |
|--|--|
| arbitrum | arbitrumOne |
| avalancheFuji | avalancheFujiTestnet |
| fantom | opera |
| fantomTestnet| ftmTestnet |
| gnosisChiado | chiado |
| harmonyOne | harmony |
| optimism | optimisticEthereum |
| optimismGoerli | optimisticGoerli |

Add a reference to your explorer API key in `etherscan.apiKey` if it doesn't already exist.

The steps are the same as described in [Deploy CREATE3 factory on local blockchain](#deploy-create3-factory-on-local-blockchain), but replace `localhost` with the name of the blockchain. e.g. if you want to deploy the factory to `polygonZkEvmTestnet`:
```
yarn hardhat run --network polygonZkEvmTestnet scripts/deployCreate3FactoryFromRawTx.js
```
To fund the signer’s address you can alternatively use apps like MetaMask or Trust (after pressing 'n'), then run the script again.

The final step in the script is an attempt to verify the contract on the blockchain explorer.

Make sure to try both deployment of the factory contract and usage of the factory on **multiple testnets** before you actually proceed to deploy on any live blockchains, to ensure that it works.


### Use a deployed CREATE3 factory on testnet or mainnet
Add the solidity contract files that you want to deploy under `contracts` directory.

If the code of the contract that you want to deploy via a factory contains `msg.sender`, then you may need to change such code before you do the deployment. More details about this are provided in [Issues to be aware of](#issues-to-be-aware-of).

Make a copy of `scripts\deployUsingCreate3Factory-TESTERC20.js` and rename it (e.g. change `TESTERC20` to the name of your main contract that you'll deploy).

In the renamed script file:
Set the value of `factoryToUse` to the factory that you'll use to deploy your contract.

Set the value of `addressOfFactory` to the correct address of the deployed factory contract.

For `salt` generation, write your own unique string (that should be associated with your contract).

Change the values of `contractToDeployName` and `constructorArguments` for the contract to be deployed. `contractToDeployName` should be the same as the name defined in the main .sol file. If there are no constructor arguments then set `constructorArguments` to `[]`.

Delete all lines referencing `wallet2Address` as that was only used for testing deployment of `TESTERC20`.

Delete the lines testing `TESTERC20` after the line `// Testing the deployed ERC20 contract`, or replace them with some lines to test your contract after it's deployed.

Run the script to deploy your contract using the factory:
```
yarn hardhat run --network polygonZkEvmTestnet scripts/deployUsingCreate3Factory-[contract name].js
```

The final step in the script is an attempt to verify the contract on the blockchain explorer.


## Problems that this tool solves
There are various possible paths that you can take to achieve the goal of deploying contracts to the same address on multiple blockchains, and there are pitfalls in each. Some are discussed below.

### Using an already-deployed CREATE3 factory
There are CREATE3 factories that have already been deployed by other people and mostly via transactions signed by their own accounts. They may have been deployed only to some blockchains but not others that you may one day want to use.

If you used such a factory to deploy your contracts on some blockchains, then if one day a new blockchain appears and you want to use that, you may then have to ask the original deployer of the factory to also deploy the same factory onto the new blockchain, and hope that he does so. It'd have to be done from his account, as only he has the private key. If he doesn't do it then you can't have your contract on the new blockchain at the desired same address.

Also, if he does try factory deployment and it fails, his account nonce may increase. The nonce can also increase if he made some other transaction in the account before. With a different nonce, it'd no longer be possible to deploy the factory contract to the same address, which would mean that you'd no longer be able to deploy your contracts to the same address as on the other blockchains that you had deployed onto before.

So with this path you become **dependent on the person** or organization who had originally deployed the factory contract, hoping that:
* they agree to deploy the factory to your desired blockchain;
* they don't change any of the originally deployed factory contract code or compilation settings, either intentionally or accidentally (as otherwise the bytecode will change, resulting in a different address);
* they do the factory deployment transaction properly such that it doesn't fail (which may increase nonce);
* the nonce doesn't increase due to a transaction happening (either intentionally or unintentionally (it has actually happened before - see details below)) in the account before the factory deployment.


### Deploying a CREATE3 factory yourself from new account
If you deploy a CREATE3 factory contract normally, in order for the contract to have the same address on multiple blockchains, you'd have to use a new account that has never made any transactions before on any blockchains so that the nonce is 0 everywhere.

The advantage is that you wouldn't have to ask someone to do the factory deployment.

But the other issues remain:
If you accidentally make a transaction in the account on a blockchain to which you haven't yet deployed the factory contract, then you deploy the factory, it will have a different address because of the different nonce.

Even if you're careful not to make any other transactions, if the deployment transaction fails then the nonce may still increase, such that if you try again then the contract will have a different address from your desired same address as your contract on other blockchains.

If any of the factory contract code is different from when you deployed it before on other blockchains then the address of the next deployment will become different. Even adding or deleting spaces or changing some comment text will cause different contract bytecode, which will result in a different deployment address.

So this method may still not be reliable for ensuring the same address on multiple blockchains.

### Using an already-deployed CREATE2 factory to deploy a CREATE3 factory
There are some CREATE2 factories already deployed on various blockchains. Using one can help to ensure that the CREATE3 factory contract gets the same address on any EVM-based blockchain. But be aware of the issues detailed below.


#### Axelar's [Constant Address Deployer](https://docs.axelar.dev/dev/general-message-passing/solidity-utilities#constant-address-deployer) and pcaversaccio's [xdeployer](https://github.com/pcaversaccio/xdeployer)
The factories from them have been deployed on many blockchains and are ready to use by anyone. But they face the same problems as described in [Using an already-deployed CREATE3 factory](#using-an-already-deployed-create3-factory) - you become dependent on the person or organization that deployed the factory. e.g. they may not agree to deploy their factories to your desired new blockchain, or their nonce in their account on a particular blockchain may increase due to a transaction before factory deployment, which actually happened with xdeployer - **the factory can no longer be deployed on Base to the same address as on other blockchains**: https://github.com/pcaversaccio/xdeployer/issues/164.

A much better offering is Arachnid's or Zoltu's [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy) as it offers a reusable signed raw deployment transaction, so anyone can deploy the CREATE2 factory and it will have the same address as on other blockchains. So you can deploy it yourself to any EVM-based blockchain (if it hasn't already been dfeployed by somoeone else) instead of asking Arachnid or Zoltu to do it for you. After you've deployed the CREATE2 factory contract (or if it already exists), you can then use it to deploy a CREATE3 factory contract. Arachnid or Zoltu deserves a lot of credit for their innovative work, but issues include:
* It assumes that you use linux, docker and geth; you'd need to make many changes if you don't use those;
* If the CREATE2 factory doesn't already exist on a new blockchain onto which you want to deploy your contracts, you'd have to deploy the CREATE2 factory first, then the CREATE3 factory, then the contracts you wanted to deploy. i.e. deploying the CREATE2 factory would be a first extra step.

## Solution and advantages
Our tool offers something similar to Arachnid's or Zoltu's "Deterministic Deployment Proxy" but for CREATE3. You run a script that creates a serialized signed deployment transaction and pushes it to the blockchain. The result is a CREATE3 factory contract deployed to an expected address. If that's repeated by you or anyone else on other blockchains, the factory contract will have the same address on those too (as long as the transaction data wasn't changed).

Rather than generating a signature from the signer as is normal in most blockchain transactions, we start with a constant human-generated signature and cryptographically *derive* the signer's address (this will be the "from" address in the factory deployment transaction). **Nobody knows the private key** for this address, so any funds sent to the address can only ever be used to pay gas for processing the associated one-time factory deployment transaction.

There would also be no risk of the account owner accidentally increasing the nonce by making some other transaction before the factory deployment, because **nobody owns the account having that address**.

The factory then effectively becomes a **shared public good** that nobody owns or controls, existing at the same address on all EVM-based blockchains and available for anyone to use without requiring permission. If it doesn't yet exist on a particular (e.g. future) blockchain, **anyone can deploy the factory** contract onto that blockchain, and the factory will then have the same address as on other blockchains.

## CREATE3 factory choices
This tool offers signed raw deployment transactions of unmodified CREATE3 factories from:
* Axelar
* ZeframLou

More choices may be offered in future.

Gas price in this deployment transaction has been set to 100 Gwei = 10<sup>-7</sup> native currency of the blockchain to ensure that it'll be deployable on most blockchains.


### Axelar
Axelar's factory was included because they are a trustworthy organization doing excellent innovative cross-chain-related work. Check them out at [axelar.network](https://axelar.network).

Axelar's factory contract `Create3Deployer.sol` has an additional function:
```solidity
deployAndInit(bytes memory bytecode, bytes32 salt, bytes calldata init)
```
which calls a function called `init` in your contract just after it's deployed. This can be used in addition to a constructor, or in place of a constructor (particularly if you are deploying an upgradeable contract, as 
upgradeable contracts don't use constructors). If you intend to use `deployAndInit` then make sure that your contract does have a function called `init` (and e.g. not `initialize` as is shown in OpenZeppelin's examples).

The exact GitHub commited files used are:
* https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/fec8f32aafe34352f315e6852b6c7d95098cef59/contracts/deploy/Create3.sol
* https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/fec8f32aafe34352f315e6852b6c7d95098cef59/contracts/deploy/Create3Deployer.sol
* https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/9cb3477d634c66c0fbf074e550bc721572e1cbd9/contracts/utils/ContractAddress.sol

Gas used for the deployment is 651,262 (or a little more for some blockchains), so gas limit in this deployment transaction has been set to 900,000, giving some room in case some opcode costs increase in future, hence there should be at least 0.09 of native currency at the signer's address before factory deployment.

Axelar's factory contract will be deployed to this address (if the transaction data is unchanged):
```
0xDd9F606e518A955Cd3800f18126DC14E54e4E995
```

### ZeframLou
ZeframLou's factory was included because it's well-known, as is the solmate CREATE3 library that it imports.

The exact GitHub commited files used are:
* https://github.com/ZeframLou/create3-factory/blob/18cfad8d118b25a5092cdfed6bea9c932ca5b6eb/src/CREATE3Factory.sol
* https://github.com/ZeframLou/create3-factory/blob/18cfad8d118b25a5092cdfed6bea9c932ca5b6eb/src/ICREATE3Factory.sol
* https://github.com/transmissions11/solmate/blob/f2833c7cc951c50e0b5fd7e505571fddc10c8f77/src/utils/CREATE3.sol
* https://github.com/transmissions11/solmate/blob/34d20fc027fe8d50da71428687024a29dc01748b/src/utils/Bytes32AddressLib.sol

Gas used for the deployment is 394,439 (or a little more for some blockchains), so gas limit in this deployment transaction has been set to 500,000, giving some room in case some opcode costs increase in future, hence there should be at least 0.05 of native currency at the signer's address before factory deployment.

The `solmate` directory has been placed in the repository root instead of under `contracts` so that `contracts\ZeframLou\create3-factory\CREATE3Factory.sol` can compile successfully without needing to change the line `import {CREATE3} from "solmate/utils/CREATE3.sol";`.

ZeframLou's factory contract will be deployed to this address (if the transaction data is unchanged):
```
0xFAD1A5cA55b731b512FeF5FEb19c60Ab35f3657f
```

## Future-proofing to ensure same deployment address in future
Innovation will never stop and new blockchains with useful features are likely to continue to arise as time goes by. So you would want to be able to add support in your ecosystem for any amazing new and popular blockchains that appear, **possibly years into the future**. What can you do now to ensure that your contract is likely to have the same address on those blockchains as on the other blockchains that you support?

Factors that can generally influence the deployment address of a contract include:
* Contract code, including spaces and comments;
* Compiler settings including:
	* Solidity version;
	* evmVersion;
	* Whether optimizer is enabled;
	* Number of optimizer runs if optimizer is enabled;
* Address of the account signing the transaction;
* Nonce of the account signing the transaction;
* Address of the factory contract being used to deploy the contract;
* Address of the account that uses the factory;
* The salt that you set when using a factory.

By using CREATE2 or CREATE3 factories, some of these factors in this general list are eliminated, e.g. nonce. CREATE3 factories in particular eliminate the contract code factor, as the bytecode is no longer used in the calculation of the address.

But you still need to be careful not to change other factors. Once you start doing deployments to live blockchains for production, it's important to try to keep everything the same for future use so that the address will be the same as before. That means not making any further updates to contract code, salt, settings, or maybe even imported packages. Consider renaming the project directory by appending the date of your first production deployment and release version number of this repository, to remind that anything in it should no longer be changed.

In our scripts, compilation artifacts of contracts are retrieved from `artifacts-saved` directory which was created to preserve the exact versions of the factories that were used for deployment. Before you start doing any contract deployments for production, you can make changes to your environment but after each change remember to copy the contents of `artifacts` directory (which Hardhat automatically creates) to `artifacts-saved`.

The factory contract code from third parties have not been modified at all, and should always be left as-is. Though if new versions of any of the files are released, then we may replace the old copies with new ones in this repository, in which case a new release of this repository would be published on GitHub with updated version number. **Newer releases may not produce the same addresses** as prior releases due to different code, so if you ever do need to re-download the repository then instead of downloading the latest version, download the exact version that you had used before for production deployments via the releases page at https://github.com/SKYBITDev3/SKYBIT-CREATE3-Factory-Transactions/releases.

For your contracts that you want to deploy using a CREATE3 factory, there's no need to use `artifacts-saved` because bytecode isn't used for address calculation in CREATE3, so even after changes in the code the deployment address will remain the same. But you should still keep the many other factors (e.g. compiler version and settings) unchanged.


## Issues to be aware of
### `msg.sender`
When you create or interact with a contract on a blockchain normally `msg.sender` in the contract code will be the address of the account that you are using. However when you use a contract (e.g. a CREATE2 or CREATE3 factory) to deploy a contract, `msg.sender` **will instead be the address of the factory** contract (or a temporary proxy).

This would be a big problem e.g. if you're deploying an ERC20 token contract having a constructor that mints the total supply to `msg.sender` and assigns it the admin role. The [OpenZeppelin Contracts Wizard](https://wizard.openzeppelin.com) generates this code:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyToken is ERC20, AccessControl {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000000000 * 10 ** decimals());
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}
```
If you use a factory to deploy this contract then 1B tokens will be minted to the factory, and the factory will be the admin, whilst you get no tokens and you won't have any ownership or control of the deployed contract.

A simple and safe solution is to pass addresses explicitly into the constructor:
```solidity
    constructor(address initialHolder, address adminAddress) ERC20("MyToken", "MTK") {
        _mint(initialHolder, 1000000000 * 10 ** decimals());
        _grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
    }
```
and in the Hardhat script add the constructor arguments e.g.:
```js
const constructorArguments = [
  wallet.address,
  "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5"
]

const cf = await ethers.getContractFactory(contractToDeployName)
const bytecodeWithArgs = (await cf.getDeployTransaction(...constructorArguments)).data
```

See also `contracts\TESTERC20.sol` in which the constructor accepts an array of addresses, and mints some tokens to each.

An alternative is to replace `msg.sender` with `tx.origin`, but Vitalik said that we shouldn't rely on `tx.origin`. Feel free to do some research if you're curious.

### Replay protection
If for a particular blockchain you get the error "only replay-protected (EIP-155) transactions allowed over RPC" then you can try a different RPC URL, find a node provider that doesn't enforce EIP-155, or run your own node using `--rpc.allow-unprotected-txs`. The protection is to prevent a transaction that was done on one blockchain (e.g. transfer 1B USDC from Peter to Mary on Ethereum) to be executed again on another blockchain (or a fork of the same blockchain) (e.g. transfer 1B USDC from Peter to Mary on Polygon). If Peter had 1B on Polygon at the same address then he'd lose it if Mary was able to replay the transaction on Polygon, so it makes sense to prevent such replay attacks.

However with our transactions for factory contract deployment we want them to be replayed. There are no issues with replaying these particular transactions because it's only for deployment of the factory, with some  native currency spent for gas. There is no way to use funds at the signer's address for anything else - funds in the account can't be transferred out because nobody knows its private key. Excess funds after the deployment transaction will simply be stuck forever.

## Licenses
### SKYBIT CREATE3 Factory Transactions
The software in this repository is released under the [MIT License](https://opensource.org/license/mit), therefore the following notices apply to this work:

Copyright (c) 2023 SKYBIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

<hr/>

This repository uses (without modification) code from [Axelar GMP SDK Solidity](https://github.com/axelarnetwork/axelar-gmp-sdk-solidity) which has been released under the [MIT License](https://opensource.org/license/mit), therefore the following notices apply to that work:

Copyright (c) 2021 Axelar Foundation

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

<hr/>

This repository uses (without modification) code from ZeframLou's [CREATE3 Factory](https://github.com/ZeframLou/create3-factory) and [solmate](https://github.com/transmissions11/solmate) which have been released under the [GNU AFFERO GENERAL PUBLIC LICENSE Version 3](https://www.gnu.org/licenses/agpl-3.0.txt), therefore the following notices apply to those works:

Copyright (C) 2022  ZeframLou
Copyright (C) 2021  transmissions11

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program.  If not, see https://www.gnu.org/licenses/agpl-3.0.txt.

