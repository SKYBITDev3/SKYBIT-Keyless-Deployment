const hre = require("hardhat")

// CHOOSE WHICH FACTORY YOU WANT TO USE: "axelarnetwork" or "ZeframLou"
const factoryToUse = "axelarnetwork"
// const factoryToUse = "ZeframLou"

// WRITE THE ADDRESS OF THE FACTORY CONTRACT HERE
const addressOfFactory = "0xDd9F606e518A955Cd3800f18126DC14E54e4E995"

// PASS YOUR OWN STRING HERE TO GENERATE A UNIQUE SALT. After doing your first production deployment, don't change it in order to have same address on other blockchains.
const salt = ethers.encodeBytes32String("SKYBIT.ASIA TESTERC20..........")

async function main() {
  const [wallet] = await ethers.getSigners()
  const balanceOfWallet = await ethers.provider.getBalance(wallet.address)
  console.log(`Using network: ${hre.network.name}${Object.hasOwn(hre.network.config, "chainId") ? ` (${hre.network.config.chainId})` : ""}, account: ${wallet.address} having ${ethers.formatUnits(balanceOfWallet, "ether")} of native currency, RPC url: ${hre.network.config.url}`)

  // WRITE YOUR CONTRACT NAME AND CONSTRUCTOR ARGUMENTS HERE
  const contractToDeployName = "TESTERC20"
  const wallet2Address = "0xEB2e452fC167b5bb948c6FC2c9215ce7F4064692"
  const constructorArguments = [
    "Token 4628",
    "TOKEN4628",
    1000,
    [wallet.address, wallet2Address], // test array constructor argument
    { x: 10, y: 5 }, // test struct constructor argument
    "0xabcdef", // test byte constructor argument. bytes have to be 0x-prefixed
  ]

  // const { rootRequire } = require("./utils")
  // const artifactOfContractToDeploy = rootRequire(`artifacts-saved/contracts/${contractToDeployName}.sol/${contractToDeployName}.json`)
  // const cf = await ethers.getContractFactory(artifactOfContractToDeploy.abi, artifactOfContractToDeploy.bytecode)
  const cf = await ethers.getContractFactory(contractToDeployName) // No need to use artifacts-saved for your contract because with CREATE3 deployment address isn't dependent on bytecode

  const bytecodeWithArgs = (await cf.getDeployTransaction(...constructorArguments)).data
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
  const gasFeeEstimate2 = feeData.gasPrice * functionCallGasCost
  console.log(`gasFeeEstimate: ${ethers.formatUnits(gasFeeEstimate2, "ether")} of native currency`)

  // Call DEPLOY
  console.log(`now calling deploy() in the CREATE3 factory...`)
  const txRec = await deploy(factoryToUse, instanceOfFactory, bytecodeWithArgs, salt)
  await txRec.wait(1)
  // console.log(`txRec: ${JSON.stringify(txRec, null, 2)}`)

  const instanceOfDeployedContract = cf.attach(expectedAddress)
  console.log(`${contractToDeployName} was successfully deployed to ${instanceOfDeployedContract.target}`)
  if (instanceOfDeployedContract.target === expectedAddress) console.log(`The actual deployment address matches the expected address`)

  // Testing the deployed ERC20 contract. If your contract isn't ERC20 then you can call a function other than balanceOf.
  const totalSupply = ethers.formatUnits(await instanceOfDeployedContract.totalSupply())
  const tokenDecimals = 18
  console.log(`${wallet.address} has ${ethers.formatUnits(await instanceOfDeployedContract.balanceOf(wallet.address), tokenDecimals)} of ${totalSupply}`)
  console.log(`${wallet2Address} has ${ethers.formatUnits(await instanceOfDeployedContract.balanceOf(wallet2Address), tokenDecimals)} of ${totalSupply}`)
  console.log(`point: ${await instanceOfDeployedContract.point()}`)
  console.log(`b: ${await instanceOfDeployedContract.b()}`)


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (!["hardhat", "localhost"].includes(hre.network.name)) {
    console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
    const { setTimeout } = require("timers/promises")
    await setTimeout(20000)

    const { verifyContract } = require("./utils")
    await verifyContract(instanceOfDeployedContract.target, constructorArguments)
  }
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

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

