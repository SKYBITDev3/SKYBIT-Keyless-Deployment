const { ethers, network } = require(`hardhat`)

// CHOOSE WHICH FACTORY YOU WANT TO USE: "axelarnetwork", "ZeframLou" or "SKYBIT"
const factoryToDeploy = `axelarnetwork`
// const factoryToDeploy = `ZeframLou`
// const factoryToDeploy = `SKYBIT`

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
  const { existsSync, cpSync } = require(`fs`)

  let savedArtifactFilePath
  switch (factory) {
    case `ZeframLou`:
      savedArtifactFilePath = `artifacts-saved/@ZeframLou/create3-factory/src/CREATE3Factory.sol/CREATE3Factory.json`
      break
    case `axelarnetwork`:
      savedArtifactFilePath = `artifacts-saved/@axelar-network/axelar-gmp-sdk-solidity/contracts/deploy/Create3Deployer.sol/Create3Deployer.json`
      break
    case `SKYBIT`:
    default:
      savedArtifactFilePath = `artifacts-saved/contracts/SKYBITCREATE3Factory.sol/SKYBITCREATE3Factory.json`
  }

  if(!existsSync(savedArtifactFilePath)) {
    console.log(`Storing new ${factory} artifact file into artifacts-saved.`)
    cpSync(savedArtifactFilePath.replace(`artifacts-saved`, `artifacts`), savedArtifactFilePath, { recursive: true })
  }

  console.log(`Using ${factory} artifact file in artifacts-saved.`)

  const { rootRequire } = require(`./utils`)
  return rootRequire(savedArtifactFilePath) // not getting from hardhat artifacts directory because contents will automatically change if there are any changes in many variables
}

const getGasLimit = (factory) => {
  switch (factory) {
    case `ZeframLou`:
      return 500000n // Gas cost: 394541
      break
    case `axelarnetwork`:
      return 900000n // Gas cost: 726632
    case `SKYBIT`:
    default:
      return 350000n // Gas cost: 253282
  }
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
