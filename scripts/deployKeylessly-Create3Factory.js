// CHOOSE WHICH FACTORY YOU WANT TO USE: "axelarnetwork" or "ZeframLou"
const factoryToDeploy = "axelarnetwork"
// const factoryToDeploy = "ZeframLou"

const isDeployEnabled = true // toggle in case you do deployment and verification separately.

const isVerifyEnabled = true

async function main() {
  const [wallet] = await ethers.getSigners()
  const balanceOfWallet = await ethers.provider.getBalance(wallet.address)
  console.log(`Using network: ${hre.network.name} (${hre.network.config.chainId}), account: ${wallet.address} having ${ethers.formatUnits(balanceOfWallet, "ether")} of native currency, RPC url: ${hre.network.config.url}`)

  const create3FactoryArtifact = getCreate3FactoryArtifact(factoryToDeploy)
  const gasLimit = getGasLimit(factoryToDeploy)

  const address = await deployKeylessly(create3FactoryArtifact.contractName, create3FactoryArtifact.bytecode, gasLimit, wallet)


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled && !["hardhat", "localhost"].includes(hre.network.name)) {
    if (isDeployEnabled) {
      console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
      const { setTimeout } = require("timers/promises")
      await setTimeout(20000)
    }
    const { verifyContract } = require("./utils")
    await verifyContract(address, [])
  } else console.log(`Verification on local network skipped`)

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
