async function main() {
  const { ethers, network, upgrades } = require(`hardhat`)
  const { printNativeCurrencyBalance } = require(`./utils`)

  const [wallet, wallet2] = await ethers.getSigners()
  console.log(`Using network: ${network.name} (${network.config.chainId}), account: ${wallet.address} having ${await printNativeCurrencyBalance(wallet.address)} of native currency, RPC url: ${network.config.url}`)

  const implContractName = `contracts/TESTERC20UGv1.sol:TESTERC20UGv1`
  const contractAddress = `0x18Fb2C4870cC1B9f9440CB0D87c41b25D486A062` // ERC1967Proxy address

  const contract = await ethers.getContractAt(implContractName, contractAddress)

  // await contract.initialize(...constructorArgsOfToken) // 'Initializable: contract is already initialized'

  console.log(`V: ${await contract.getV()}`)

  // Upgrading
  const implContractNameV2 = `contracts/TESTERC20UGv2.sol:TESTERC20UGv2`
  const cfImplV2 = await ethers.getContractFactory(implContractNameV2)

  let implAddress = await upgrades.erc1967.getImplementationAddress(contractAddress)
  console.log(`Old implementation address: ${implAddress}`)

  await upgrades.validateUpgrade(contract, cfImplV2)
  console.log(`validation of upgrade to ${implContractNameV2} was successful. Now upgrading...`)

  const upgraded = await upgrades.upgradeProxy(contractAddress, cfImplV2)
  console.log(`Upgraded name: ${await upgraded.name()}`)
  console.log(`Upgraded V: ${await upgraded.getV()}`)

  implAddress = await upgrades.erc1967.getImplementationAddress(contractAddress)
  console.log(`New implementation address: ${implAddress}`)

  console.log(`Continue to use the proxy address ${contractAddress} to operate with your contract`)


  // VERIFY ON BLOCKCHAIN EXPLORER
  if (![`hardhat`, `localhost`].includes(network.name)) {
    console.log(`Waiting to ensure that it will be ready for verification on etherscan...`)
    const { setTimeout } = require(`timers/promises`)
    await setTimeout(20000)
    const { verifyContract } = require(`./utils`)
    await verifyContract(contractAddress) // proxy. also verifies implementation
  }

}


main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
