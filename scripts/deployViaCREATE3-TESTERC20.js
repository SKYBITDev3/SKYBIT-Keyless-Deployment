const { ethers, network } = require(`hardhat`)

// CHOOSE WHICH FACTORY YOU WANT TO USE:
// const factoryToUse = `axelarnetwork`
// const addressOfFactory = `0xb56144Efcf9b9F1A23395a3B7cAF295A9Cb494A2` // gas cost: 2248784

// const factoryToUse = `ZeframLou`
// const addressOfFactory = `0x3855FB9AE7E051E2e74BfE3f04228762d28D8641` // gas cost: 2169509

// const factoryToUse = `SKYBIT`
// const addressOfFactory = `0x619Bdd2F58Ba735e9390D7B177e5Ca3C410bf98c` // gas cost: 2140281

const factoryToUse = `SKYBITLite`
const addressOfFactory = `0x7f1a18EA6D565D6Dc46750C1978113a50979ac8c` // if evmVersion: `paris`. gas cost: 2135494
// const addressOfFactory = `0x7a843AbD8541ce366ADb7A1c23B6cc4A7262ada7` // if evmVersion: `shanghai`. gas cost: 2111524

// PASS YOUR OWN STRING HERE TO GENERATE A UNIQUE SALT. After doing your first production deployment, don't change it in order to have same address on other blockchains.
const salt = ethers.encodeBytes32String(`SKYBIT.ASIA TESTERC20..........`)

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
  const deployedContract = await CREATE3Deploy(factoryToUse, addressOfFactory, cfToken, tokenContractName, constructorArgs, salt, wallet)
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
  if (![`hardhat`, `localhost`].includes(network.name)) {
    console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
    const { setTimeout } = require(`timers/promises`)
    await setTimeout(20000)

    await verifyContract(deployedContract.target, constructorArgs)
  }
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

