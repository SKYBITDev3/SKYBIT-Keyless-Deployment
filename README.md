
# SKYBIT Keyless Deployment of Smart Contracts
## Introduction
This repository is for anyone who wants to **deploy smart contracts to the same address** on multiple Ethereum-Virtual-Machine (EVM)-based blockchains. There are many ways to achieve this, but there can be pitfalls depending on which path you take (see the section [Problems that this tool solves](#problems-that-this-tool-solves) for details). It's important to consider your options before you start any deployments to a live blockchain, as it'd be **difficult to switch later** after realizing that you had made a bad decision, especially if many users are already using the contracts that you had deployed.

This repository offers scripts to perform *keyless* smart contract deployment, in which a contract is deployed from a **single-use account** that nobody owns and whose **private keys are unknown and not needed**. Regardless of who does the deployment, as long as the transaction bytecode remains the same, the contract will always get the same address on any EVM blockchain. This method is described in the [ERC-1820: Pseudo-introspection Registry Contract](https://eips.ethereum.org/EIPS/eip-1820#deployment-method) Ethereum standard in which the registry contract is deployed to an expected predetermined address.

The two main options of using keyless deployment are:
- Use a **factory contract that had been deployed keylessly** to deploy your contracts;
	- If the factory contract doesn't yet exist on any blockchains that you want to use, first deploy it yourself keylessly, then use it. The factory contract will have the same address as on the other blockchains because of keyless deployment.
	- You must use the same factory having same addresses on each blockchain in order to achieve the same addresses for your contracts across all EVM-based blockchains.
- **Deploy your contracts keylessly** (without using any factory) onto all blockchains. 
  - The advantage is that you won't have to safeguard the private key for future deployments, as any account can initiate the deployment.
  - As anyone could initiate the deployment of your contract, there may be security considerations e.g. if administrator privileges need to be assigned on deployment.
  - This is more expensive and complicated than other methods.
  - You must keep the code and constructor arguments unchanged to get the same address.

Each option will be discussed in more detail below.


## Using factory contracts
[CREATE2](https://eips.ethereum.org/EIPS/eip-1014) or CREATE3 factories help to achieve same addresses on multipe blockchains because the deployment address can be known any time beforehand. They are smart contracts that you can use to create instances of your contracts on EVM-based blockchains.


### CREATE, CREATE2 and CREATE3
`CREATE` and `CREATE2` are operation codes ("opcodes") in EVM-based blockchains for creating a smart contract from another smart contract.

#### `CREATE`
Contract addresses are calculated using the:
- address of the factory contract (that calls `CREATE` opcode) itself;
- nonce of the factory contract ([EIP-161](https://eips.ethereum.org/EIPS/eip-161) specifies that contract nonce starts at 1, not 0 like EOAs).

#### `CREATE2`
Contract addresses are calculated using the:
- address of the factory contract (that calls `CREATE2` opcode) itself;
- bytecode of the contract;
- salt (a chosen value).

CREATE2 factories may also factor in the address of the account that uses the factory to deploy the contract to ensure uniqueness of the deployment address.

As the nonce is not required in the contract address calculation, it's possible to know the contract's address on the blockchain before it's deployed regardless of how many transactions have been done in the account.

#### CREATE3
CREATE3 isn't itself an EVM opcode but a method that uses `CREATE` and `CREATE2` in combination to eliminate the bytecode from contract address calculation.

Internally, first `CREATE2` is used to deploy a CREATE factory or "proxy" which then deploys your contract. So the only data required for address calculation is:
- address of the factory contract itself;
- salt (a chosen value).

CREATE3 factories may also factor in the address of the account that uses the factory to deploy the contract to ensure uniqueness of the deployment address.

You then won't have to worry about accidentally making changes to your contracts (which would cause a different deployment address if you used CREATE2).

It also makes it possible to:
- Deploy your contract with updated code / using newer compiler on a new blockchain that will have the same address as the older version that had already been deployed on other blockchains;
- use different constructor arguments on different blockchains.

<hr/>

### CREATE3 factory choices
This repository creates signed raw deployment transactions of unmodified CREATE3 factories from:
- Axelar
- ZeframLou & transmissions11/solmate
- SKYBIT & Vectorized/solady
- SKYBITLite

Gas price in the deployment transaction has been set to 100 Gwei = 10<sup>-7</sup> native currency of the blockchain. This is a high value for most blockchains but it's to ensure that the contract will be deployable.


#### Axelar
Axelar's factory was included because they are a trustworthy organization doing excellent innovative cross-chain-related work. Check them out at [axelar.network](https://axelar.network).

Axelar's factory contract `Create3Deployer.sol` has an additional function:
```solidity
deployAndInit(bytes memory bytecode, bytes32 salt, bytes calldata init)
```
which calls a function called `init` in your contract just after it's deployed. This can be used in addition to a constructor, or in place of one (particularly if you are deploying an upgradeable contract, as 
upgradeable contracts may not use constructors). If you intend to use `deployAndInit` then make sure that your contract does have a function called `init`.

The original solidity files were obtained by firstly adding the npm package `@axelar-network/axelar-gmp-sdk-solidity` and importing `@axelar-network/axelar-gmp-sdk-solidity/contracts/deploy/Create3Deployer.sol` in `contracts/Imports.sol`. Hardhat then compiles it and places the artifacts in `artifacts` directory. `Create3Deployer.json` is then copied to `artifacts-saved/@axelar-network/axelar-gmp-sdk-solidity/contracts/deploy/Create3Deployer.sol/` directory for preservation of the bytecode.

Gas used for the deployment is 726,644 (or a little more for some blockchains), so gas limit in this deployment transaction has been set to 900,000, giving some room in case some opcode costs increase in future, hence there should be at least 0.09 of native currency at the signer's address before factory deployment.

Axelar's factory contract will be deployed to this address (if the transaction bytecode is unchanged):
```
0xb56144Efcf9b9F1A23395a3B7cAF295A9Cb494A2
```
The derived address of the account that would sign the deployment transaction, and that you'd need to fund in order to pay the gas fee, is:
```
0x8A41d12f9573164B407953BdD14061AB5d81be46
```

#### ZeframLou & transmissions11/solmate
ZeframLou's factory was included because it's well-known, as is the solmate CREATE3 library that it imports.

The original solidity files were obtained by firstly adding the specific github repository commits to `package.json`:
- https://github.com/ZeframLou/create3-factory#18cfad8d118b25a5092cdfed6bea9c932ca5b6eb
- https://github.com/transmissions11/solmate#f2833c7cc951c50e0b5fd7e505571fddc10c8f77

`@ZeframLou/create3-factory/src/CREATE3Factory.sol` is imported in `contracts/Imports.sol`. The `solmate/utils` directory is copied from `node_modules` to the repository root so that compilation would run without needing to change the line `import {CREATE3} from "solmate/utils/CREATE3.sol";` in the original factory contract. Hardhat then compiles it and places the artifacts in `artifacts` directory. `CREATE3Factory.json` was then copied to `artifacts-saved/@ZeframLou/create3-factory/src/CREATE3Factory.sol/` directory for preservation of the bytecode.

Gas used for the deployment is 394,439 (or a little more for some blockchains), so gas limit in this deployment transaction has been set to 500,000, giving some room in case some opcode costs increase in future, hence there should be at least 0.05 of native currency at the signer's address before factory deployment.

ZeframLou's factory contract will be deployed to this address (if the transaction bytecode is unchanged):
```
0x3855FB9AE7E051E2e74BfE3f04228762d28D8641
```
The derived address of the account that would sign the deployment transaction, and that you'd need to fund in order to pay the gas fee, is:
```
0x39C104112A9436FF51188F0D7dF84c3bAAf4e096
```
#### SKYBIT & Vectorized/solady
The Vectorized/solady CREATE3 library has been included because it is more gas-efficient than other options. A factory contract is needed to use the library so a new one was created based on ZeframLou's factory.

The original Vectorized/solady CREATE3 solidity file was obtained by firstly adding the specific github repository commit to `package.json`:
https://github.com/Vectorized/solady#03f3fd05fb1da76edc4df83ae6bf32a842c15f12
`contracts/SKYBITCREATE3Factory.sol` imports `{CREATE3} from "@Vectorized/solady/src/utils/CREATE3.sol";`. Hardhat then compiles it and places the artifacts in `artifacts` directory. `SKYBITCREATE3Factory.json` was then copied to `artifacts-saved/contracts/SKYBITCREATE3Factory.sol/` directory for preservation of the bytecode.

Gas used for the deployment is 253,282 (or a little more for some blockchains), so gas limit in this deployment transaction has been set to 350,000, giving some room in case some opcode costs increase in future, hence there should be at least 0.035 of native currency at the signer's address before factory deployment.

The SKYBIT factory contract will be deployed to this address (if the transaction bytecode is unchanged):
```
0x619Bdd2F58Ba735e9390D7B177e5Ca3C410bf98c
```
The derived address of the account that would sign the deployment transaction, and that you'd need to fund in order to pay the gas fee, is:
```
0x4ac8d0FF33fad2E2C83AAf383eb1A452a9374a96
```

#### SKYBITLite
We've developed a new highly gas-efficient light-weight CREATE3 factory in pure Yul language. It costs only around a third of the gas to deploy the factory contract compared with the SKYBIT & Vectorized/solady factory, and almost a tenth when compared with Axelar's factory.

The node package [@tovarishfin/hardhat-yul](https://www.npmjs.com/package/@tovarishfin/hardhat-yul) compiles the Yul source code in `contracts/SKYBITCREATE3FactoryLite.yul` and places the artifacts in `artifacts` directory. `SKYBITCREATE3FactoryLite.json` was then copied to `artifacts-saved/contracts/SKYBITCREATE3FactoryLite.sol/` directory for preservation of the bytecode.

Gas used for the deployment is 86,004 (or a little more for some blockchains), so gas limit in this deployment transaction has been set to 100,000, giving some room in case some opcode costs increase in future, hence there should be at least 0.01 of native currency at the signer's address before factory deployment.

The SKYBITLite factory contract will be deployed to this address (if the transaction bytecode is unchanged):
```
0xb0c211d66A1B3F393C197533E3A1140834729df8
```
The derived address of the account that would sign the deployment transaction, and that you'd need to fund in order to pay the gas fee, is:
```
0x17b61C311e299086232385FB462c9064530c5767
```


### Usage
Other people may have already deployed the factory contract onto some of your desired blockchains to the expected address (if they didn't change the deployment transaction data), in which case you won't need to deploy it on those blockchains - you can then just use those already-deployed factory contracts to deploy whatever other contracts you want to deploy. So first check the expected address on a blockchain explorer to see if a factory contract already exists there.

If there isn't one yet then you'll need to deploy the factory contract via a **reusable signed raw deployment transaction**. The factory contract will then have the same address as on other blockchains (as long as the transaction bytecode stays the same). See the steps below to deploy the factory.

Run in a terminal:
```
git clone https://github.com/SKYBITDev3/SKYBIT-Keyless-Deployment
cd SKYBIT-Keyless-Deployment
yarn
```

In `scripts/deployKeylessly-Create3Factory.js` change the value of `factoryToDeploy` to the factory you want to deploy from the options available.

#### Deploy CREATE3 factory on local blockchain
Start a blockchain node on your local machine in its own terminal:
```
yarn hardhat node
```
Run the script in a separate terminal to deploy the factory:
```
yarn hardhat run --network localhost scripts/deployKeylessly-Create3Factory.js
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
0x64C2520B09320d97ccc38E5e41bE2cb617f41337 now has 0.09 of native currency
Deploying axelarnetwork factory contract by pushing signed raw transaction to localhost...
axelarnetwork factory contract was successfully deployed to 0xDd9F606e518A955Cd3800f18126DC14E54e4E995 in transaction 0xfaed49a1cdaf6dc03b99681e6d3c12fa6c80bae439f4f0458ca1af43a76d0b45
```
Note the address of the deployed factory contract as you'll need it when you want to use it.

#### Test the CREATE3 factory on local blockchain
`TESTERC20` as defined in `contracts/TESTERC20.sol` will be deployed using the factory that has been deployed.

In `scripts/deployViaCREATE3-TESTERC20.js`, set the value of `addressOfFactory` to the correct address of the deployed factory contract.

Run the script to deploy `TESTERC20` using the factory:
```
yarn hardhat run --network localhost scripts/deployViaCREATE3-TESTERC20.js
```
Output like this appears:
```
Using network: localhost (31337), account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 having 9999.909981625 of native currency, RPC url: http://127.0.0.1:8545
salt: 0x534b594249542e41534941205445535445524332302e2e2e2e2e2e2e2e2e2e00
Expected address of TESTERC20 using factory at 0xDd9F606e518A955Cd3800f18126DC14E54e4E995: 0x88DCddf9FC5EecA013cFe5919606695E8Db36ce6
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

#### Deploy CREATE3 factory to testnet or mainnet
Copy `.env.example` to `.env` and enter any necessary values, including your API key to verify your contract on the explorer of the blockchain you will use.

In `hardhat.config.js` do the following:

Set `accounts` to the one(s) that you will use.

Check whether the blockchains you will use are listed in [@wagmi/chains](https://github.com/wagmi-dev/viem/blob/main/src/chains/index.ts). If not, then add the blockchain info in `additionalNetworks`.

For the few blockchain names in [@wagmi/chains](https://github.com/wagmi-dev/viem/blob/main/src/chains/index.ts) that don't match exactly with names in [hardhat-verify](https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-verify/src/internal/chain-config.ts), use the [hardhat-verify](https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-verify/src/internal/chain-config.ts) version as shown in this table:

| In [@wagmi/chains](https://github.com/wagmi-dev/viem/blob/main/src/chains/index.ts) | In [hardhat-verify](https://github.com/NomicFoundation/hardhat/blob/main/packages/hardhat-verify/src/internal/chain-config.ts) (use these) |
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
yarn hardhat run --network polygonZkEvmTestnet scripts/deployKeylessly-Create3Factory.js
```
To fund the signer’s address you can alternatively use apps like MetaMask or Trust (after pressing 'n'), then run the script again.

The final step in the script is an attempt to verify the contract on the blockchain explorer.

Make sure to try both deployment of the factory contract and usage of the factory on **multiple testnets** before you actually proceed to deploy on any live blockchains, to ensure that it works.


#### Use a deployed CREATE3 factory on testnet or mainnet
Add the solidity contract files that you want to deploy under `contracts` directory.

If the code of the contract that you want to deploy via a factory contains `msg.sender`, then you may need to change such code before you do the deployment. More details about this are provided in [Issues to be aware of](#issues-to-be-aware-of).

Make a copy of `scripts/deployViaCREATE3-TESTERC20.js` and rename it (e.g. change `TESTERC20` to the name of your main contract that you'll deploy).

In the renamed script file:
Set the value of `factoryToUse` to the factory that you'll use to deploy your contract.

Set the value of `addressOfFactory` to the correct address of the deployed factory contract.

For `salt` generation, write your own unique string (that should be associated with your contract).

Change the values of `contractName` and `constructorArgs` for the contract to be deployed. `contractName` should be the same as the name defined in the main .sol file. If there are no constructor arguments then set `constructorArgs` to `[]`.

Delete all lines referencing `wallet2Address` as that was only used for testing deployment of `TESTERC20`.

Delete the lines testing `TESTERC20` after the line `// Testing the deployed ERC20 contract`, or replace them with some lines to test your contract after it's deployed.

Run the script to deploy your contract using the factory:
```
yarn hardhat run --network polygonZkEvmTestnet scripts/deployViaCREATE3-[contract name].js
```

The final step in the script is an attempt to verify the contract on the blockchain explorer.

## Deploying keylessly without using a factory
If you don't have many contracts to deploy then skipping the use (and deployment) of a factory is an alternative. In the same way that a factory was deployed keylessly above, your contracts themselves can each be deployed keylessly instead.

Any account can perform the deployment by broadcasting exactly the same saved transaction bytecode, and your contracts will always be deployed to the same address on all EVM-based blockchains. There are no private keys to safeguard for future deployments, increasing flexibility.

Keyless deployment of *factory* contracts is suitable as factories are meant to be publicly used. But for your contracts, consider whether it's OK for any stranger to deploy them. e.g. if the contract assigns administrator privileges on deployment, the stranger who deployed your contract may become administrator, which you wouldn't want. So you'd either need to modify your code, or use a keylessly-deployed factory instead.

If your contract uses `msg.sender` in the constructor, the value will be the address of the single-use account that nobody owns or controls, which is probably not what you'd expect or want, so you'd need to modify the code. See [Issues to be aware of](#issues-to-be-aware-of).

Keyless deployment is more expensive than other methods because the gas price in the transaction has been set to 100 Gwei, a value that is likely to be higher than in the prevailing gas fee market of most blockchains. The value cannot vary because that would cause different transaction bytecode (which would then cause a different contract address). On some blockchains the market gas price may be 10 Gwei, in which case you'd be paying 10 times the market rate for keyless deployment.

To deploy your contract keylessly just copy, rename and customize `deployKeylessly-TESTERC20.js`, then run:
```
yarn hardhat run --network [blockchain name] scripts/deployKeylessly-[contract name].js
```
The script will check whether compilation artifacts of your contract exists under the `artifacts-saved` directory, and if so it will ask you whether you want to overwrite it by a possibly newer version from the `artifacts` directory. If you had already deployed your contract keylessly on other live blockchains and want it to get the same address, press 'n', otherwise different transaction bytecode may be broadcast, causing a different contract address.

## Upgradeable contracts
If you have upgradeable contracts that follow the UUPS proxy pattern (as recommended by OpenZeppelin in [Transparent vs UUPS Proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#transparent-vs-uups) then there are two different options this repository can help you with:
- Deploy both your implementation and `ERC1967Proxy` contracts keylessly by using a customized version of `scripts/deployKeylessly-TESTERC20UG.js`;
  - `ERC1967Proxy` has a constructor that takes the address of the implementation and initialization arguments. These affect the address, so you'd have to make sure that they are kept the same when deploying on each blockchain. That means the implementation contract shouldn't be deployed normally as then its own address would be dependent on account nonce.
- Deploy your implementation normally and `ERC1967Proxy` contract via a keylessly-deployed CREATE3 factory by using a customized version of `scripts/deployViaCREATE3-TESTERC20UG.js`.
  - Your contract can be deployed normally because by using CREATE3 to deploy `ERC1967Proxy`, the constructor arguments won't affect the address, because contract bytecode isn't used for address calculation. So regardless of what address your contract is deployed to (and even if source code is different), the proxy will always have the same expected address (as long as other critical variables like salt, and solidity compiler configuration are unchanged).

When it comes time to upgrade your contract, you can use a customized version of `scripts/upgrade-TESTERC20UG.js`, which simply calls `upgradeProxy` in OpenZeppelin's [Upgrades Plugin](https://docs.openzeppelin.com/upgrades-plugins/1.x). The originally-deployed `ERC1967Proxy` contract will remain, but point to a new version of your contract that's deployed normally.


## Problems that this tool solves
There are various possible paths that you can take to achieve the goal of deploying contracts to the same address on multiple blockchains, and there are pitfalls in each. Some are discussed below.

### Deploy normally synchronizing nonces
Contracts that are deployed normally have their addresses calculated based on the address and nonce of the account that does the deployment. Nonce is a transaction count. So in order for contracts to get the same addresses on multiple blockchains, the number of transactions need to be the same in the account on each blockchain. So great care needs to be taken so that transactions don't happen accidentally. Sometimes transactions can fail but still increase nonce.

Many of the popular multi-blockchain platforms, such as UniSwap and OpenGSN, tried nonce synchronization but eventually failed to maintain same addresses across the blockchains that they support.

The contract bytecode that is deployed must be kept the same for each blockchain. Changes in source code (including spaces and comment text), constructor arguments or compiler settings can change the bytecode and cause a different address.

This is a precarious method for having same addresses on multiple blockchains, and is therefore not recommended.

### Using an existing factory that wasn't deployed keylessly
There are CREATE2 and CREATE3 factories that have already been deployed by other people and mostly via transactions signed by their own accounts. They may have been deployed only to some blockchains but not others that you may one day want to use.

If you used such a factory to deploy your contracts on some blockchains, then if one day a new blockchain appears and you want to use that, you may then have to ask the original deployer of the factory to also deploy the same factory onto the new blockchain, and hope that he does so. It'd have to be done from his account, as only he has the private key. If he doesn't do it then you can't have your contract on the new blockchain at the desired same address.

Also, if he does try factory deployment and it fails, his account nonce may increase. The nonce can also increase if he made some other transaction in the account before. With a different nonce, it'd no longer be possible to deploy the factory contract to the same address, which would mean that you'd no longer be able to deploy your contracts to the same address as on the other blockchains that you had deployed onto before.

So with this path you become **dependent on the person** or organization who had originally deployed the factory contract, hoping that:
- they agree to deploy the factory to your desired blockchain;
- they don't change any of the originally deployed factory contract code or compilation settings, either intentionally or accidentally (as otherwise the bytecode will change, resulting in a different address);
- they do the factory deployment transaction properly such that it doesn't fail (which may increase nonce);
- the nonce doesn't increase due to a transaction happening (either intentionally or unintentionally (it has actually happened before - see details below)) in the account before the factory deployment.

### Deploying a factory yourself normally (not keylessly)
If you deploy a CREATE2 or CREATE3 factory contract normally, in order for the contract to have the same address on multiple blockchains, you'd have to make sure that your account has the same nonce when deploying on each blockchain. Usually it's easiest to use a fresh new account that has never made any transactions before on any blockchains so that the nonce is 0 everywhere.

The advantage is that you wouldn't have to ask someone to do the factory deployment.

But the other issues remain:
If you accidentally make a transaction in the account on a blockchain to which you haven't yet deployed the factory contract, then you deploy the factory, it will have a different address because of the different nonce.

Even if you're careful not to make any other transactions, if the deployment transaction fails then the nonce may still increase, such that if you try again then the contract will have a different address from your desired same address as your contract on other blockchains.

If any of the factory contract code is different from when you deployed it before on other blockchains then the address of the next deployment will become different. Even adding or deleting spaces or changing some comment text will cause different contract bytecode, which will result in a different deployment address.

So this method may still not be reliable for ensuring the same address on multiple blockchains.

### Using an already-deployed CREATE2 factory to deploy a CREATE3 factory
There are some CREATE2 factories already deployed on various blockchains. Using one can help to ensure that the CREATE3 factory contract gets the same address on any EVM-based blockchain. But be aware of the issues detailed below.

#### Axelar's [Constant Address Deployer](https://docs.axelar.dev/dev/general-message-passing/solidity-utilities#constant-address-deployer) and pcaversaccio's [xdeployer](https://github.com/pcaversaccio/xdeployer)
The factories from them have been deployed on many blockchains and are ready to use by anyone. But they face the same problems as described in [Using an existing factory that wasn't deployed keylessly](#using-an-existing-factory-that-wasn't-deployed-keylessly) - you become dependent on the person or organization that deployed the factory. e.g. they may not agree to deploy their factories to your desired new blockchain, or their nonce in their account on a particular blockchain may increase due to a transaction before factory deployment, which actually happened with xdeployer - **the factory can no longer be deployed on Base to the same address as on other blockchains**: https://github.com/pcaversaccio/xdeployer/issues/164.

A much better offering is Arachnid's [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy) as it offers a reusable signed raw deployment transaction, so anyone can deploy the CREATE2 factory and it will have the same address as on other blockchains. So you can deploy it yourself to any EVM-based blockchain (if it hasn't already been deployed by somoeone else) instead of asking Arachnid to do it for you. After you've deployed the CREATE2 factory contract (or if it already exists), you can then use it to deploy a CREATE3 factory contract. Arachnid & Zoltu deserve a lot of credit for their innovative work, but issues include:
- It assumes that you use linux, docker and geth; you'd need to make many changes if you don't use those;
- If the CREATE2 factory doesn't already exist on a new blockchain onto which you want to deploy your contracts, you'd have to deploy the CREATE2 factory first, then the CREATE3 factory, then the contracts you wanted to deploy. i.e. deploying the CREATE2 factory would be a first extra step;
- You need to ensure that the salt is unique to prevent others from deploying your contract to the same address, as it doesn't hash your account address with the salt like other factories.

## Solution and advantages
The script `deployKeylessly-Create3Factory.js` creates a serialized, signed and keyless deployment transaction and broadcasts it to the blockchain. The result is a CREATE3 factory contract deployed to an expected address. If that's repeated by you or anyone else on other blockchains, the factory contract will have the same address on those too (as long as the transaction data and compiler configuration wasn't changed). You can then run your customized copy of `deployViaCREATE3-TESTERC20.js` to deploy your contracts to consistent addresses.

### How it works
Rather than generating a signature from the signer as is normal in most blockchain transactions, we start with a constant human-generated signature then cryptographically *derive* the signer's address (this will be the "from" address in the factory deployment transaction). **Nobody knows the private key** for this address, so any funds sent to the address can only ever be used to pay gas for processing the associated one-time factory deployment transaction.

There would also be no risk of the account owner accidentally increasing the nonce by making some other transaction before the factory deployment, because **nobody owns the account having that address**.

The factory then effectively becomes a **shared public good** that nobody owns or controls, existing at the same address on all EVM-based blockchains and available for anyone to use without requiring permission. If it doesn't yet exist on a particular (e.g. future) blockchain, **anyone can deploy the factory** contract onto that blockchain, and the factory will then have the same address as on other blockchains.

If you deploy your contracts keylessly without using a factory, the added advantage is that you won't need to safeguard the private key of the account that was used to do the deployment - even if you use a different account (or someone else performs the deployment), the contract will still be deployed to the same address. Disadvantages include:
- higher cost, because the gas price has been intentionally set high. If you have many contracts to deploy you'd have to spend highly for each. You'd also have to fund a different address for each contract, so there would be some funds left over in each after deployment. Such remaining funds will be wasted because there is no way to recover them.
- the contract bytecode affects the address because CREATE2 or CREATE3 aren't being used. Even slight changes to the source code or constructor arguments will change the bytecode, resulting in a different deployment address.


## Future-proofing to ensure same deployment address in future
Innovation will never stop and new blockchains with useful features are likely to continue to arise as time goes by. So you would want to be able to add support in your ecosystem for any amazing new and popular blockchains that appear, **possibly years into the future**. What can you do now to ensure that your contract is likely to have the same address on those blockchains as on the other blockchains that you support?

Factors that can generally influence the deployment address of a contract include:
- Contract bytecode which is affected by:
  - Contract source code, including spaces and comments;
  - Constructor arguments;
  - Compiler configuration including:
	  - Solidity version;
      - evmVersion;
      - Whether optimizer is enabled;
      - Number of optimizer runs if optimizer is enabled;
- Address of the factory contract being used to deploy the contract;
- Address of the account signing the transaction;
- Nonce of the account signing the transaction;
- Address of the account that uses the factory;
- The salt that you set when using a factory.

By using keyless deployment and / or keylessly-deployed CREATE2 or CREATE3 factories, some of these factors in this general list are eliminated, e.g. nonce. CREATE3 factories in particular eliminate the contract code factor, as the bytecode is no longer used in the calculation of the address.

But you still need to be careful not to change other factors. Once you start doing deployments to live blockchains for a production environment, it's important to try to keep everything the same for future use so that the address will be the same as before. That means not making any further updates to contract code, salt, settings, or maybe even imported packages. Consider renaming the project directory by appending the date of your first production deployment and Github commit hash, to remind that anything in it should no longer be changed.

In our scripts, compilation artifacts of contracts are retrieved from `artifacts-saved` directory which was created to preserve the exact versions of the factories that were used for deployment. Before you start doing any contract deployments for production, you can make changes to your environment but after each change remember to copy the factorys' compilation artifact files under `artifacts` directory (which Hardhat automatically creates) to `artifacts-saved`.

If newer versions of factory contract code from third parties become available, they will be updated in this repository. This may cause changes in deployment addresses due to different bytecode. So if you ever do need to re-download the repository then instead of downloading the latest version, download the exact commit that you had used before for production deployments. If you haven't yet made any production deployments, make a note of the GitHub commit hash when you do in case.

For your contracts that you want to deploy using a CREATE3 factory, there's no need to use `artifacts-saved` because bytecode isn't used for address calculation in CREATE3, so even after changes in the code or constructor arguments the deployment address will remain the same. But you should still keep the many other factors (e.g. compiler version and settings) unchanged.

For your contracts that you deploy keylessly *without* a factory, you need to ensure that the code, constructor arguments, and compiler configuration are unchanged.


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
const constructorArgs= [
  wallet.address,
  "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5"
]

const cf = await ethers.getContractFactory(contractName)
const bytecodeWithArgs = (await cf.getDeployTransaction(...constructorArgs)).data
```

See also `contracts/TESTERC20.sol` in which the constructor accepts an array of addresses, and mints some tokens to each.

An alternative is to replace `msg.sender` with `tx.origin`, but Vitalik said that we shouldn't rely on `tx.origin`. Feel free to do some research if you're curious.

### Invalid opcode
If you try to deploy to non-Ethereum blockchains contracts that were compiled using the latest version of Solidity compiler, you may get the error "invalid opcode", because most blockchains have not implemented `PUSH0` opcode yet. It was introduced in Ethereum's shanghai upgrade which happened in April 2023. Based on our tests, the blockchain that support `PUSH0` opcode are:
-   auroraTestnet
-   edgeware
-   edgewareTestnet
-   gnosis
-   chiado
-   goerli
-   mainnet
-   moonbaseAlpha
-   moonbeam
-   moonriver
-   polygonZkEvm
-   polygonZkEvmTestnet
-   pulsechain
-   pulsechainV4
-   sapphire
-   sapphireTestnet
-   scrollSepolia
-   sepolia
-   syscoin
-   syscoinTestnet
-   taikoTestnetSepolia

If the blockchain that you want to use does not yet support `PUSHO` then in the meantime you can set the value of `evmVersion` to a previous version in `hardhat.config.js` like this:
```js
  solidity: { // changing these values affects deployment address
    compilers: [
      {
        version: `0.8.21`,
        settings: {
          optimizer: {
            enabled: true,
            runs: 15000
          },
          evmVersion: `paris`, // shanghai is current default but many blockchains don't support push0 opcode yet (causing "ProviderError: invalid opcode: opcode 0x5f not defined" and "ProviderError: execution reverted"). paris is prior version. 
        }
      },
    ],
  },
```
Note that this would mean that once you start deploying your contracts to live blockchains for production, **you cannot change this**, as if you do then subsequent deployments of the same contract may not get the same address. So if you really do want to use the latest EVM version, you'll have to wait for the blockchain to start supporting `PUSH0` before deploying without the explicit `evmVersion` setting for live operations.


### Replay protection
If for a particular blockchain you get the error "only replay-protected (EIP-155) transactions allowed over RPC" then you can try a different RPC URL, find a node provider that doesn't enforce EIP-155, or run your own node using `--rpc.allow-unprotected-txs`. The protection is to prevent a transaction that was done on one blockchain (e.g. transfer 1B USDC from Peter to Mary on Ethereum) to be executed again on another blockchain (or a fork of the same blockchain) (e.g. transfer 1B USDC from Peter to Mary on Polygon). If Peter had 1B on Polygon at the same address then he'd lose it if Mary was able to replay the transaction on Polygon, so it makes sense to prevent such replay attacks.

However with our transactions for factory contract deployment we want them to be replayed. There are no issues with replaying these particular transactions because it's only for deployment of the factory, with some  native currency spent for gas. There is no way to use funds at the signer's address for anything else - funds in the account can't be transferred out because nobody knows its private key. Excess funds after the deployment transaction will simply be stuck forever.

## Licenses
### SKYBIT Keyless Deployment
The software in this repository is released under the [MIT License](https://opensource.org/license/mit), therefore the following notices apply to this work:

Copyright (c) 2023 SKYBIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

<hr/>

This repository uses (without modification) code from [Axelar GMP SDK Solidity](https://github.com/axelarnetwork/axelar-gmp-sdk-solidity) and [Solady](https://github.com/Vectorized/solady) which have been released under the [MIT License](https://opensource.org/license/mit), therefore the following notices apply to those works:

Copyright (c) 2021 Axelar Foundation
Copyright (c) 2022 Solady

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

<hr/>

This repository uses code from ZeframLou's [CREATE3 Factory](https://github.com/ZeframLou/create3-factory) and [solmate](https://github.com/transmissions11/solmate) which have been released under the [GNU AFFERO GENERAL PUBLIC LICENSE Version 3](https://www.gnu.org/licenses/agpl-3.0.txt), therefore the following notices apply to those works:

Copyright (C) 2022  ZeframLou
Copyright (C) 2021  transmissions11

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program.  If not, see https://www.gnu.org/licenses/agpl-3.0.txt.
