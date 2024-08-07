// Both implementation and proxy deployed keylessly. If you've already deployed the proxy contract and then change your contract source code or constructor arguments then don't run this script again, otherwise a new proxy contract will be deployed. Instead you should run upgrade.

let isDeployEnabled = true // set to false initially to get gas cost or if you've already deployed and need to do verification on explorer.

const isVerifyEnabled = true

// First run with gasLimit = 0n to see expected gas cost in output for your contract. Then set gasLimit to a rounded-up value for future-proofing. Try to make it > 25% * gasCost. DON'T CHANGE IT AFTER DEPLOYING YOUR FIRST CONTRACT TO LIVE BLOCKCHAIN.
// const gasLimitForImpl = 0n
const gasLimitForImpl = 4000000n
const gasLimitForProxy = 500000n


async function main() {
  const { ethers, network, upgrades } = require(`hardhat`)
  const { printNativeCurrencyBalance } = require(`./utils`)

  const [wallet] = await ethers.getSigners()
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${await printNativeCurrencyBalance(wallet.address)} of native currency, RPC url: ${network.config.url}`)

  // WRITE YOUR CONTRACT NAME AND CONSTRUCTOR ARGUMENTS HERE
  const implContractName = `contracts/TESTERC20UGv1.sol:TESTERC20UGv1`
  const initializerArgs = [ // constructor not used in UUPS contracts. Instead, proxy will call initializer
    wallet.address,
    { x: 10, y: 5 },
  ]

  const { getArtifactOfContract, deployKeylessly } = require(`./keyless-deploy-functions`)

  const artifactOfContractToDeploy = getArtifactOfContract(implContractName)
  const cfImpl = await ethers.getContractFactory(artifactOfContractToDeploy.abi, artifactOfContractToDeploy.bytecode)
  const bytecodeWithArgs = (await cfImpl.getDeployTransaction()).data // no constructor args

  const implAddress = await deployKeylessly(implContractName, bytecodeWithArgs, gasLimitForImpl, wallet, isDeployEnabled) // gas cost: 3012861
  if (implAddress === undefined) return

  const proxyContractName = `@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy`
  const cfProxy = await ethers.getContractFactory(proxyContractName)
  const fragment = cfImpl.interface.getFunction(`initialize`)
  const initializerData = cfImpl.interface.encodeFunctionData(fragment, initializerArgs)
  const proxyConstructorArgs = [implAddress, initializerData]

  const proxyBytecodeWithArgs = (await cfProxy.getDeployTransaction(...proxyConstructorArgs)).data

  const proxyAddress = await deployKeylessly(proxyContractName, proxyBytecodeWithArgs, gasLimitForProxy, wallet, isDeployEnabled) // gas cost: 378214

  if (isDeployEnabled) {
    await upgrades.forceImport(proxyAddress, cfImpl)
    console.log(`implementation has been connected with proxy`)
  }


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (isVerifyEnabled) {
    if (![`hardhat`, `localhost`].includes(network.name)) {
      if (isDeployEnabled) {
        console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
        const { setTimeout } = require(`timers/promises`)
        await setTimeout(20000)
      }
      const { verifyContract } = require(`./utils`)
      await verifyContract(proxyAddress, [], implContractName) // also verifies implementation. Added contract name to prevent the error "More than one contract was found to match the deployed bytecode"
    } else console.log(`Verification on local network skipped`)
  }
}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
