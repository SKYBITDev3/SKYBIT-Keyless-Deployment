const CREATE3Deploy = async (factoryToUse, addressOfFactory, contractFactory, contractToDeployName, constructorArguments, salt, wallet) => {
  const { ethers } = require(`hardhat`)

  const bytecodeWithArgs = (await contractFactory.getDeployTransaction(...constructorArguments)).data
  // console.log(`bytecodeWithArgs: ${bytecodeWithArgs}`)

  const artifactOfFactory = getArtifactOfFactory(factoryToUse)
  const instanceOfFactory = await ethers.getContractAt(artifactOfFactory.abi, addressOfFactory)

  console.log(`salt: ${salt}`)

  const addressExpected = await getDeployedAddress(factoryToUse, instanceOfFactory, bytecodeWithArgs, wallet.address, salt)
  console.log(`Expected address of ${contractToDeployName} using deployer at ${addressOfFactory}: ${addressExpected}`)

  if (await ethers.provider.getCode(addressExpected) !== `0x`) {
    console.log(`The contract already exists at ${addressExpected}`)
    return
  }

  const functionCallGasCost = await getGasEstimate(factoryToUse, instanceOfFactory, bytecodeWithArgs, salt)
  console.log(`functionCallGasCost: ${functionCallGasCost}`)
  const feeData = await ethers.provider.getFeeData()
  console.log(`feeData: ${JSON.stringify(feeData)}`)
  const gasFeeEstimate = feeData.gasPrice * functionCallGasCost
  console.log(`gasFeeEstimate: ${ethers.formatUnits(gasFeeEstimate, `ether`)} of native currency`)

  // Call DEPLOY
  console.log(`now calling deploy() in the CREATE3 factory...`)
  const txRec = await deploy(factoryToUse, instanceOfFactory, bytecodeWithArgs, salt, feeData)
  await txRec.wait(1)
  // console.log(`txRec: ${JSON.stringify(txRec, null, 2)}`)

  const instanceOfDeployedContract = contractFactory.attach(addressExpected)
  console.log(`${contractToDeployName} was successfully deployed to ${instanceOfDeployedContract.target}`)
  if (instanceOfDeployedContract.target === addressExpected) console.log(`The actual deployment address matches the expected address`)

  return instanceOfDeployedContract
}

const getArtifactOfFactory = (factoryToUse) => {
  let savedArtifactFilePath
  switch (factoryToUse) {
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
  const { rootRequire } = require(`./utils`) // using saved artifact instead of the automatically created one}
  return rootRequire(savedArtifactFilePath)
}

const getDeployedAddress = async (factoryToUse, instanceOfFactory, bytecode, walletAddress, salt) => {
  switch (factoryToUse) {
    case `axelarnetwork`:
      return await instanceOfFactory.deployedAddress(bytecode, walletAddress, salt)
      break
    case `SKYBIT`:
    case `ZeframLou`:
    default:
      return await instanceOfFactory.getDeployed(walletAddress, salt)
  }
}

const getGasEstimate = async (factoryToUse, instanceOfFactory, bytecodeWithArgs, salt) => {
  switch (factoryToUse) {
    case `axelarnetwork`:
      return await instanceOfFactory.deploy.estimateGas(bytecodeWithArgs, salt)
      break
    case `SKYBIT`:
    case `ZeframLou`:
    default:
      return await instanceOfFactory.deploy.estimateGas(salt, bytecodeWithArgs)
  }
}

const deploy = async (factoryToUse, instanceOfFactory, bytecodeWithArgs, salt, feeData) => {
  delete feeData.gasPrice

  switch (factoryToUse) {
    case `axelarnetwork`:
      return await instanceOfFactory.deploy(bytecodeWithArgs, salt, { ...feeData })
      break
    case `SKYBIT`:
    case `ZeframLou`:
    default:
      return await instanceOfFactory.deploy(salt, bytecodeWithArgs, { ...feeData })
  }
}


module.exports = {
  CREATE3Deploy,
  getArtifactOfFactory,
  getDeployedAddress,
  getGasEstimate,
  deploy,
}
