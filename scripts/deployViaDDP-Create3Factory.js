// CHOOSE WHICH FACTORY YOU WANT TO USE:
// const factoryToDeploy = `axelarnetwork`
// const factoryToDeploy = `ZeframLou`
// const factoryToDeploy = `SKYBITSolady`
const factoryToDeploy = `SKYBITLite`

const isDeployEnabled = true // toggle in case you do deployment and verification separately.

const isVerifyEnabled = true

async function main() {
  const { ethers, network } = require(`hardhat`)
  const [wallet] = await ethers.getSigners()
  const balanceOfWallet = await ethers.provider.getBalance(wallet.address)
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${ethers.formatUnits(balanceOfWallet, `ether`)} of native currency, RPC url: ${network.config.url}`)

  const create3FactoryArtifact = getCreate3FactoryArtifact(factoryToDeploy)
  const gasLimit = getGasLimit(factoryToDeploy)

  // deploy using Arachnid's CREATE2 factory ("Deterministic Deployment Proxy") which already exists on many blockchains. See https://github.com/Arachnid/deterministic-deployment-proxy
  const create2FactoryAddress = `0x4e59b44847b379578588920cA78FbF26c0B4956C`
  const salt = ethers.encodeBytes32String(``) // 0x0000000000000000000000000000000000000000000000000000000000000000

  const txData = {
    to: create2FactoryAddress,
    data: create3FactoryArtifact.bytecode.replace(`0x`, salt),
    gasLimit
  }

  const addressExpected = ethers.getCreate2Address(create2FactoryAddress, salt, ethers.keccak256(create3FactoryArtifact.bytecode))

  console.log(`Deploying ${factoryToDeploy} via Arachnid's CREATE2 factory ("Deterministic Deployment Proxy").`)
  console.log(`expected address using ethers.getCreate2Address: ${addressExpected}`)
  
  if (await ethers.provider.getCode(addressExpected) !== `0x`) {
    console.error(`A contract already exists at ${addressExpected} on ${network.config.chainId}`)
    return
  }
  
  console.log(`expected address using await wallet.call(txData): ${await wallet.call(txData)}`)

  const txResponse = await wallet.sendTransaction(txData)
  console.log(`txResponse: ${JSON.stringify(txResponse, null, 2)}`)

  const txReceipt = await txResponse.wait()
  console.log(`txReceipt: ${JSON.stringify(txReceipt, null, 2)}`)

  if (await ethers.provider.getCode(addressExpected) !== `0x`) {
    console.log(`${factoryToDeploy} was successfully deployed via Arachnid's CREATE2 factory to ${addressExpected} on ${network.name}`)
  } else console.error(`${factoryToDeploy} was not found at ${addressExpected}`)


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled && factoryToDeploy !== `SKYBITLite` && ![`hardhat`, `localhost`].includes(network.name)) {
    if (isDeployEnabled) {
      console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
      const { setTimeout } = require(`timers/promises`)
      await setTimeout(20000)
    }
    const { verifyContract } = require(`./utils`)
    await verifyContract(address, [])
  } else console.log(`Verification on explorer skipped`)

}


const getCreate3FactoryArtifact = factory => {
  let compiledArtifactFilePath
  switch (factory) { // Get hardhat's compiled artifact file first for comparison with saved copy
    case `ZeframLou`:
      compiledArtifactFilePath = `artifacts/@SKYBITDev3/ZeframLou-create3-factory/src/CREATE3Factory.sol/CREATE3Factory.json`
      break
    case `axelarnetwork`:
      compiledArtifactFilePath = `artifacts/@axelar-network/axelar-gmp-sdk-solidity/contracts/deploy/Create3Deployer.sol/Create3Deployer.json`
      break
    case `SKYBITSolady`:
      compiledArtifactFilePath = `artifacts/contracts/SKYBITCREATE3Factory.sol/SKYBITCREATE3Factory.json`
      break
    case `SKYBITLite`:
    default:
      compiledArtifactFilePath = `artifacts/contracts/SKYBITCREATE3FactoryLite.yul/SKYBITCREATE3FactoryLite.json`
  }

  const { getSavedArtifactFile } = require(`./keyless-deploy-functions`)
  return getSavedArtifactFile(factory, compiledArtifactFilePath)
}


const getGasLimit = (factory) => {
  switch (factory) {
    case `ZeframLou`:
      return 500000n
      break
    case `axelarnetwork`:
      return 900000n
      break
    case `SKYBITSolady`:
      return 300000n
      break
    case `SKYBITLite`:
    default:
      return 100000n
  }
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
