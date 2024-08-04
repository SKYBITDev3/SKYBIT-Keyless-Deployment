const isDeployEnabled = true // set to false initially to get gas cost or if you've already deployed and need to do verification on explorer.

const isVerifyEnabled = true

// First run with gasLimit = 0n to see expected gas cost in output for your contract. Then set gasLimit to a rounded-up value for future-proofing. Try to make it > 25% * gasCost. DON'T CHANGE IT AFTER DEPLOYING YOUR FIRST CONTRACT TO LIVE BLOCKCHAIN.
// const gasLimit = 0n
const gasLimit = 2500000n

async function main() {
  const { ethers, network } = require(`hardhat`)
  const [wallet] = await ethers.getSigners()
  const balanceOfWallet = await ethers.provider.getBalance(wallet.address)
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${ethers.formatUnits(balanceOfWallet, `ether`)} of native currency, RPC url: ${network.config.url}`)

  // WRITE YOUR CONTRACT NAME AND CONSTRUCTOR ARGUMENTS HERE
  const contractName = `contracts/TESTERC20.sol:TESTERC20`
  const wallet2Address = `0xEB2e452fC167b5bb948c6FC2c9215ce7F4064692` // just for testing deployed token
  const constructorArgs = [
    `Token 4628`,
    `TOKEN4628`,
    1000,
    [wallet.address, wallet2Address], // test array constructor argument
    { x: 10, y: 5 }, // test struct constructor argument
    `0xabcdef`, // test byte constructor argument. bytes have to be 0x-prefixed
  ]

  const { getArtifactOfContract, deployKeylessly } = require(`./keyless-deploy-functions`)

  const artifactOfContractToDeploy = getArtifactOfContract(contractName)
  const cfToken = await ethers.getContractFactory(artifactOfContractToDeploy.abi, artifactOfContractToDeploy.bytecode)
  const bytecodeWithArgs = (await cfToken.getDeployTransaction(...constructorArgs)).data

  const address = await deployKeylessly(contractName, bytecodeWithArgs, gasLimit, wallet, isDeployEnabled)


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled) {
    if (![`hardhat`, `localhost`].includes(network.name)) {
      if (isDeployEnabled) {
        console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
        const { setTimeout } = require(`timers/promises`)
        await setTimeout(20000)
      }
      const { verifyContract } = require(`./utils`)
      await verifyContract(address, constructorArgs)
    } else console.log(`Verification on local network skipped`)
  }
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
