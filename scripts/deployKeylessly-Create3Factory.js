const { ethers, network } = require(`hardhat`)

// CHOOSE WHICH FACTORY YOU WANT TO USE: "axelarnetwork", "ZeframLou" or "SKYBIT"
// const factoryToDeploy = `axelarnetwork`
// const factoryToDeploy = `ZeframLou`
const factoryToDeploy = `SKYBIT`

const isDeployEnabled = true // toggle in case you do deployment and verification separately.

const isVerifyEnabled = true

async function main() {
  const [wallet] = await ethers.getSigners()
  const balanceOfWallet = await ethers.provider.getBalance(wallet.address)
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${ethers.formatUnits(balanceOfWallet, `ether`)} of native currency, RPC url: ${network.config.url}`)

  const create3FactoryArtifact = getCreate3FactoryArtifact(factoryToDeploy)
  const gasLimit = getGasLimit(factoryToDeploy)

  const { deployKeylessly } = require(`./keyless-deploy-functions`)
  const address = await deployKeylessly(create3FactoryArtifact.contractName, create3FactoryArtifact.bytecode, gasLimit, wallet, isDeployEnabled)


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled && ![`hardhat`, `localhost`].includes(network.name)) {
    if (isDeployEnabled) {
      console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
      const { setTimeout } = require(`timers/promises`)
      await setTimeout(20000)
    }
    const { verifyContract } = require(`./utils`)
    await verifyContract(address, [])
  } else console.log(`Verification on local network skipped`)

}


const getCreate3FactoryArtifact = (factory) => {
  let pathToArtifact
  switch (factory) {
    case `ZeframLou`:
      pathToArtifact = `artifacts-saved/@ZeframLou/create3-factory/src/CREATE3Factory.sol/CREATE3Factory.json`
      break
    case `axelarnetwork`:
      pathToArtifact = `artifacts-saved/@axelar-network/axelar-gmp-sdk-solidity/contracts/deploy/Create3Deployer.sol/Create3Deployer.json`
      break
    case `SKYBIT`:
    default:
      pathToArtifact = `artifacts-saved/contracts/SKYBITCREATE3Factory.sol/SKYBITCREATE3Factory.json`
  }
  const { rootRequire } = require(`./utils`)
  return rootRequire(pathToArtifact) // not getting from hardhat artifacts directory because contents will automatically change if there are any changes in many variables
}

const getGasLimit = (factory) => {
  switch (factory) {
    case `ZeframLou`:
      return 500000n // Gas used: 394,439
      break
    case `axelarnetwork`:
      return 900000n // Gas used: 651,262
    case `SKYBIT`:
    default:
      return 400000n // Gas used: 253,282
  }
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
