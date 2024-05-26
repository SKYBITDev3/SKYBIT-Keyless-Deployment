const { ethers, network } = require(`hardhat`)

// CHOOSE WHICH FACTORY YOU WANT TO USE:
// const factoryToUse = { name: `axelarnetwork`, address: `0x8cf037a598957EFE440841E256f4CA0056A8219C` }
// const factoryToUse = { name: `ZeframLou`, address: `0x03B583D983aAe5a965dfCC3565F58C9153Af1Be3` }
// const factoryToUse = { name: `SKYBITSolady`, address: `0x5391d63aBd39A43360CE360531f5Ba5c19249030` }
const factoryToUse = { name: `SKYBITLite`, address: `0x739201bA340A675624D9ADb1cc27e68F76a29765` }


const isDeployEnabled = true // toggle in case you do deployment and verification separately.
const isVerifyEnabled = true
// PASS YOUR OWN STRING HERE TO GENERATE A UNIQUE SALT. After doing your first production deployment, don't change it in order to have same address on other blockchains.
const saltForCREATE3 = ethers.encodeBytes32String(`SKYBIT.ASIA TESTERC20..........`)

async function main() {
  const { rootRequire, printNativeCurrencyBalance, verifyContract } = require(`./utils`)
  const [wallet] = await ethers.getSigners()
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${await printNativeCurrencyBalance(wallet.address)} of native currency, RPC url: ${network.config.url}`)

  // WRITE YOUR CONTRACT NAME AND CONSTRUCTOR ARGUMENTS HERE
  const tokenContractName = `TESTERC20`
  const wallet2Address = `0xEB2e452fC167b5bb948c6FC2c9215ce7F4064692`
  const constructorArgs = [
    `Token 4628`,
    `TOKEN4628`,
    1000,
    [wallet.address, wallet2Address], // test array constructor argument
    { x: 10, y: 5 }, // test struct constructor argument
    `0xabcdef`, // test byte constructor argument. bytes have to be 0x-prefixed
  ]

  // const { rootRequire } = require(`./utils`)
  // const artifactOfContractToDeploy = rootRequire(`artifacts-saved/contracts/${tokenContractName}.sol/${tokenContractName}.json`)
  // const cfToken = await ethers.getContractFactory(artifactOfContractToDeploy.abi, artifactOfContractToDeploy.bytecode)
  const cfToken = await ethers.getContractFactory(tokenContractName) // No need to use artifacts-saved for your contract because with CREATE3 deployment address isn't dependent on bytecode

  const { CREATE3Deploy } = rootRequire(`scripts/CREATE3-deploy-functions.js`)
  const deployedContract = await CREATE3Deploy(factoryToUse.name, factoryToUse.address, cfToken, tokenContractName, constructorArgs, saltForCREATE3, wallet, isDeployEnabled)
  if(deployedContract === undefined) return

  // Testing the deployed ERC20 contract. If your contract isn't ERC20 then you can call a function other than balanceOf.
  console.log(`Testing:`)
  const totalSupply = ethers.formatUnits(await deployedContract.totalSupply())
  const tokenDecimals = 18
  console.log(`${wallet.address} has ${ethers.formatUnits(await deployedContract.balanceOf(wallet.address), tokenDecimals)} of ${totalSupply}`)
  console.log(`${wallet2Address} has ${ethers.formatUnits(await deployedContract.balanceOf(wallet2Address), tokenDecimals)} of ${totalSupply}`)
  console.log(`point: ${await deployedContract.point()}`)
  console.log(`b: ${await deployedContract.b()}`)


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled) {
  if (![`hardhat`, `localhost`].includes(network.name)) {
    console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
    const { setTimeout } = require(`timers/promises`)
    await setTimeout(20000)

    await verifyContract(deployedContract.target, constructorArgs)
  }
}
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

