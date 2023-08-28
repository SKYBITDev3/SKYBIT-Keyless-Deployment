const hre = require("hardhat")

// const path = require("path")
// const rootPath = path.resolve(__dirname, "..")
// const rootRequire = (name) => require(`${rootPath}/${name}`)

const CREATE3Deploy = async (factoryToUse, addressOfFactory, contractFactory, contractToDeployName, constructorArguments, salt, wallet) => {
  const bytecodeWithArgs = (await contractFactory.getDeployTransaction(...constructorArguments)).data
  // console.log(`bytecodeWithArgs: ${bytecodeWithArgs}`)

  const artifactOfFactory = getArtifactOfFactory(factoryToUse)
  const instanceOfFactory = await ethers.getContractAt(artifactOfFactory.abi, addressOfFactory)

  console.log(`salt: ${salt}`)

  const expectedAddress = await getDeployedAddress(factoryToUse, instanceOfFactory, wallet.address, salt)
  console.log(`Expected address of ${contractToDeployName} using deployer at ${addressOfFactory}: ${expectedAddress}`)


  const feeData = await ethers.provider.getFeeData()
  console.log(`feeData: ${JSON.stringify(feeData)}`)
  const functionCallGasCost = await getGasEstimate(factoryToUse, instanceOfFactory, bytecodeWithArgs, salt)
  console.log(`functionCallGasCost: ${functionCallGasCost}`)
  const gasFeeEstimate = feeData.gasPrice * functionCallGasCost
  console.log(`gasFeeEstimate: ${ethers.formatUnits(gasFeeEstimate, "ether")} of native currency`)

  // Call DEPLOY
  console.log(`now calling deploy() in the CREATE3 factory...`)
  const txRec = await deploy(factoryToUse, instanceOfFactory, bytecodeWithArgs, salt)
  await txRec.wait(1)
  // console.log(`txRec: ${JSON.stringify(txRec, null, 2)}`)

  const instanceOfDeployedContract = contractFactory.attach(expectedAddress)
  console.log(`${contractToDeployName} was successfully deployed to ${instanceOfDeployedContract.target}`)
  if (instanceOfDeployedContract.target === expectedAddress) console.log(`The actual deployment address matches the expected address`)

  return instanceOfDeployedContract
}

const getArtifactOfFactory = (factoryToUse) => {
  let pathToArtifact
  switch (factoryToUse) {
    case "ZeframLou":
      pathToArtifact = `artifacts-saved/contracts/ZeframLou/create3-factory/CREATE3Factory.sol/CREATE3Factory.json`
      break
    case "axelarnetwork":
    default:
      pathToArtifact = `artifacts-saved/contracts/axelarnetwork/axelar-gmp-sdk-solidity/deploy/Create3Deployer.sol/Create3Deployer.json`
  }
  const { rootRequire } = require("./utils") // using saved artifact instead of the automatically created one}
  return rootRequire(pathToArtifact)
}

const getDeployedAddress = async (factoryToUse, instanceOfFactory, walletAddress, salt) => {
  switch (factoryToUse) {
    case "ZeframLou":
      return await instanceOfFactory.getDeployed(walletAddress, salt)
      break
    case "axelarnetwork":
    default:
      return await instanceOfFactory.deployedAddress(walletAddress, salt)
  }
}

const getGasEstimate = async (factoryToUse, instanceOfFactory, bytecodeWithArgs, salt) => {
  switch (factoryToUse) {
    case "ZeframLou":
      return await instanceOfFactory.deploy.estimateGas(salt, bytecodeWithArgs)
      break
    case "axelarnetwork":
    default:
      return await instanceOfFactory.deploy.estimateGas(bytecodeWithArgs, salt)
  }
}

const deploy = async (factoryToUse, instanceOfFactory, bytecodeWithArgs, salt) => {
  switch (factoryToUse) {
    case "ZeframLou":
      return await instanceOfFactory.deploy(salt, bytecodeWithArgs)
      break
    case "axelarnetwork":
    default:
      return await instanceOfFactory.deploy(bytecodeWithArgs, salt)
  }
}


module.exports = {
  CREATE3Deploy,
  getArtifactOfFactory,
  getDeployedAddress,
  getGasEstimate,
  deploy,
}
