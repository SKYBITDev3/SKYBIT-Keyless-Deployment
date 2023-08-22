const hre = require("hardhat")
// BigInt.prototype["toJSON"] = () => this.toString() // To prevent TypeError: Do not know how to serialize a BigInt

// CHOOSE WHICH FACTORY YOU WANT TO USE: "axelarnetwork" or "ZeframLou"
const factoryToDeploy = "axelarnetwork"
// const factoryToDeploy = "ZeframLou"

const isDeployEnabled = true // toggle in case you do deployment and verification separately.
// const isDeployEnabled = false
const isVerifyEnabled = true
// const isVerifyEnabled = false

async function main() {
  const [wallet] = await ethers.getSigners()
  const balanceOfWallet = await ethers.provider.getBalance(wallet.address)
  console.log(`Using network: ${hre.network.name} (${hre.network.config.chainId}), account: ${wallet.address} having ${ethers.formatUnits(balanceOfWallet, "ether")} of native currency, RPC url: ${hre.network.config.url}`)

  const create3FactoryArtifact = getCreate3FactoryArtifact(factoryToDeploy)

  const gasLimit = getGasLimit(factoryToDeploy)

  // Keep this data consistent otherwise the deployment address will become different
  const txData = {
    type: 0,
    data: create3FactoryArtifact.bytecode,
    nonce: 0,
    gasLimit,
    gasPrice: 100000000000n, // = 100 Gwei
    value: 0,
    chainId: 0,
  }

  // Keep this data consistent otherwise the deployment address will become different
  const splitSig = { // manually created
    r: "0x3333333333333333333333333333333333333333333333333333333333333333",
    s: "0x3333333333333333333333333333333333333333333333333333333333333333",
    v: 27
  }

  const { deriveAddressOfSignerFromSig } = require("./utils")
  const derivedAddressOfSigner = await deriveAddressOfSignerFromSig(txData, splitSig)
  console.log(`Derived address of transaction signer: ${derivedAddressOfSigner}`)

  txData.signature = splitSig
  const txSignedSerialized = ethers.Transaction.from(txData).serialized
  // console.log(`Signed raw transaction to be pushed to ${hre.network.name}: ${txSignedSerialized}`)

  // const tx = ethers.Transaction.from(txSignedSerialized) // checking the contents of signed transaction
  // console.log(`Signed transaction: ${JSON.stringify(tx, null, 2)}`)

  const addressOfCreate3Factory = ethers.getCreateAddress({ from: derivedAddressOfSigner, nonce: txData.nonce })
  console.log(`Expected address of deployed ${factoryToDeploy} factory contract: ${addressOfCreate3Factory}`)

  if(await ethers.provider.getCode(addressOfCreate3Factory) !== "0x") {
    console.log(`The factory contract already exists at ${addressOfCreate3Factory}. So you can now simply use it.`)
    return
  }

  const txSignedSerializedHash = ethers.keccak256(txSignedSerialized)
  console.log(`Expected transaction ID: ${txSignedSerializedHash}`)


  const gasCost = await ethers.provider.estimateGas({ data: create3FactoryArtifact.bytecode })
  console.log(`Expected gas cost: ${gasCost}`)
  const gasFeeEstimate = BigInt(txData.gasPrice) * gasCost
  console.log(`gasFeeEstimate: ${ethers.formatUnits(gasFeeEstimate, "ether")} of native currency`)


  // FUND SIGNER - There needs to be some funds at derivedAddressOfSigner to pay gas fee for the deployment.
  const isTransactionSignerFunded = isDeployEnabled ? await fundTransactionSigner(txData.gasPrice, txData.gasLimit, derivedAddressOfSigner, wallet) : true
  if (!isTransactionSignerFunded) return


  // THE DEPLOYMENT TRANSACTION
  if (isDeployEnabled) {
    console.log(`Deploying ${factoryToDeploy} factory contract by pushing signed raw transaction to ${hre.network.name}...`)
    const transactionId = await ethers.provider.send("eth_sendRawTransaction", [txSignedSerialized])
    console.log(`${factoryToDeploy} factory contract was successfully deployed to ${addressOfCreate3Factory} in transaction ${transactionId}`)
  }


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled && !["hardhat", "localhost"].includes(hre.network.name)) {
    if (isDeployEnabled) {
      console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
      const { setTimeout } = require("timers/promises")
      await setTimeout(20000)
    }
    const { verifyContract } = require("./utils")
    await verifyContract(addressOfCreate3Factory, [])
  }
}


const fundTransactionSigner = async (gasPrice, gasLimit, derivedAddressOfSigner, wallet) => {
  const balanceOfSignerMinRequired = gasPrice * gasLimit
  console.log(`Minimum balance of signer required based on the gasPrice and gasLimit: ${gasPrice} x ${gasLimit} wei = ${ethers.formatUnits(balanceOfSignerMinRequired, "ether")} of native currency`)
  let balanceOfSigner = await ethers.provider.getBalance(derivedAddressOfSigner)
  console.log(`balanceOfSigner: ${ethers.formatUnits(balanceOfSigner, "ether")}`)

  const shortfall = balanceOfSignerMinRequired - balanceOfSigner
  if (balanceOfSigner < balanceOfSignerMinRequired) {
    const balanceOfWallet = await ethers.provider.getBalance(wallet.address)
    if (balanceOfWallet > balanceOfSignerMinRequired) {
      const readlineSync = require("readline-sync")
      const anwser = readlineSync.question(`There are insufficient funds at ${derivedAddressOfSigner} on ${hre.network.name} to push the transaction. Do you want to try to transfer ${ethers.formatUnits(shortfall, "ether")} of native currency from your wallet ${wallet.address} to there now (y/n)? `)
      if (["y", "Y"].includes(anwser)) {
        console.log(`Transferring ${ethers.formatUnits(shortfall, "ether")} of native currency from ${wallet.address} to ${derivedAddressOfSigner} on ${hre.network.name}...`)
        let txRec = await wallet.sendTransaction({ to: derivedAddressOfSigner, value: shortfall })
        await txRec.wait(1)
        balanceOfSigner = await ethers.provider.getBalance(derivedAddressOfSigner)
        console.log(`${derivedAddressOfSigner} now has ${ethers.formatUnits(balanceOfSigner, "ether")}`)
        return true
      }
    }
    console.log(`There are insufficient funds at ${derivedAddressOfSigner} on ${hre.network.name} to push the transaction. Transfer at least ${ethers.formatUnits(shortfall, "ether")} of native currency to there and try again.`)
    return false
  }
  return true
}

const getCreate3FactoryArtifact = (factoryToDeploy) => {
  let pathToArtifact
  switch (factoryToDeploy) {
    case "ZeframLou":
      // The exact GitHub commited files used are:
      // https://github.com/ZeframLou/create3-factory/blob/18cfad8d118b25a5092cdfed6bea9c932ca5b6eb/src/CREATE3Factory.sol
      // https://github.com/ZeframLou/create3-factory/blob/18cfad8d118b25a5092cdfed6bea9c932ca5b6eb/src/ICREATE3Factory.sol
      // https://github.com/transmissions11/solmate/blob/f2833c7cc951c50e0b5fd7e505571fddc10c8f77/src/utils/CREATE3.sol
      // https://github.com/transmissions11/solmate/blob/34d20fc027fe8d50da71428687024a29dc01748b/src/utils/Bytes32AddressLib.sol
      pathToArtifact = `artifacts-saved/contracts/ZeframLou/create3-factory/CREATE3Factory.sol/CREATE3Factory.json`
      break
    case "axelarnetwork":
    default:
      // The exact GitHub commited files used are:
      // https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/fec8f32aafe34352f315e6852b6c7d95098cef59/contracts/deploy/Create3.sol
      // https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/fec8f32aafe34352f315e6852b6c7d95098cef59/contracts/deploy/Create3Deployer.sol
      // https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/9cb3477d634c66c0fbf074e550bc721572e1cbd9/contracts/utils/ContractAddress.sol
      pathToArtifact = `artifacts-saved/contracts/axelarnetwork/axelar-gmp-sdk-solidity/deploy/Create3Deployer.sol/Create3Deployer.json`
  }
  const { rootRequire } = require("./utils")
  return rootRequire(pathToArtifact) // not getting from hardhat artifacts directory because contents will automatically change if there are any changes in many variables
}

const getGasLimit = (factoryToDeploy) => {
  switch (factoryToDeploy) {
    case "ZeframLou":
      return 500000n // Gas used: 394,439
      break
    case "axelarnetwork":
    default:
      return 900000n // Gas used: 651,262
  }
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
